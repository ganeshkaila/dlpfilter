/**
 * Copyright 2017, Google, Inc.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

// Imports the Google Cloud Data Loss Prevention library
const DLP = require('@google-cloud/dlp');

// Imports the Google Cloud client library
const Logging = require('@google-cloud/logging');

// Imports the nodejslibraries
const fs = require('fs');
const Tail = require('always-tail');
const mime = require('mime');
const Buffer = require('safe-buffer').Buffer;

// Imports the Logger library
const Logger = require('./lib/logger.js');
const DlpfilterLogging = require('./lib/dlpfilterLogging.js');

// The infoTypes of information to redact
// const infoTypes = [{ name: 'EMAIL_ADDRESS' }, { name: 'PHONE_NUMBER' }];

// The minimum likelihood required before redacting a match
const minLikelihood = 'LIKELIHOOD_UNSPECIFIED';

function redactFromExistingFiles(verbose, sourceFiles, infoTypes) {
    // Instantiates a client
    const dlp = new DLP.DlpServiceClient();
    const logger = new Logger.Logger();
    const dlpfileterLogging = new DlpfilterLogging.DlpLogger();

    const opts = {
        verbose: verbose,
        end: {},
    };

    /****************************************************
     * Redact the existing content from files.
     ****************************************************/
    /*
        const fileItems = sourceFiles.map(file => {
            return {
                type: mime.getType(file) || 'application/octet-stream',
                data: Buffer.from(fs.readFileSync(file)).toString('base64'),
            };
        });

        const redactionConfigs = infoTypes.map(infoType => {
            return {
                infoType: infoType,
                replaceWith: infoType.name,
            };
        });

        const fileRequest = {
            inspectConfig: {
                minLikelihood: minLikelihood,
            },
            replaceConfigs: redactionConfigs,
            items: fileItems,
        };

        dlp
            .redactContent(fileRequest)
            .then(body => {
                body[0].items.map(item => {
                    logger.info(item.data.toString(), opts, () => {});
                });
            })
            .catch(err => {
                console.log(`Error in redactStream: ${err.message || err}`);
            });
    */

    sourceFiles.forEach(file => {
        require('fs').readFileSync(file).toString().split('\n').forEach(line => {
            dlpfileterLogging.info(line, opts, infoTypes, () => {});
            if (verbose === true && line !== "") {
                console.log('Original info: ' + line);
            }
        });
    });

    /****************************************************
     * Redact the tailing content from files.
     ****************************************************/
    sourceFiles.forEach(function(file) {
        new Tail(file, '\n')
            .on('line', function(string) {
                dlpfileterLogging.info(string, opts, infoTypes, () => {});
                if (verbose === true) {
                    console.log('Original info: ' + string);
                }
            });
    });
}

function redactFromStackdriverLogs(verbose, logNames, infoTypes) {
    // Instantiates a client
    const dlp = new DLP.DlpServiceClient();
    const logger = new Logger.Logger();
    const dlpfileterLogging = new DlpfilterLogging.DlpLogger();
    const stackdriverLogging = new Logging();

    var prevInsertId, prevLen;
    var newEntries = [];

    const opts = {
        verbose: verbose,
        end: {},
    };

    setInterval(function() {
        logNames.forEach(function(logName) {
            stackdriverLogging.log(logName)
                .getEntries({
                    orderBy: 'timestamp'
                })
                .then(results => {
                    const entries = results[0];
                    for (var index = 0; index < entries.length; index++) {
                        if (prevInsertId == null) {
                            newEntries = entries.slice(0, entries.length);
                        } else if (prevInsertId === entries[index].metadata.insertId && prevLen < entries.length) {
                            newEntries = entries.slice(index + 1, entries.length);
                        } else {
                            continue;
                        }
                    }

                    if (newEntries.length !== 0) {
                        newEntries.forEach((entry, index) => {
                            if (entry.metadata.payload === 'textPayload') {
                                dlpfileterLogging.info(entry.data, opts, infoTypes, () => {});
                                if (verbose === true) {
                                    console.log('Original info: ' + entry.data);
                                }
                            } else if (entry.metadata.payload === 'jsonPayload') {
                                dlpfileterLogging.info(JSON.stringify(entry.data), opts, infoTypes, () => {});
                                if (verbose === true) {
                                    console.log('Original info: ' + JSON.stringify(entry.data));
                                }
                            }
                            prevInsertId = entry.metadata.insertId;
                        });
                        prevLen = entries.length;
                        newEntries = [];
                        return;
                    }
                });
        });
    }, 10000);
}

const cli = require(`yargs`)
    .demand(1)
    .command(
        `stackdriver-logging`,
        `Redact sensitive data in stackdriver logging using the Data Loss Prevention API.`,
        function(yargs) {
            return yargs
                .demand(1)
                .command(
                    `files`,
                    `Redact sensitive data of the exising log files and send to stackdriver logging.`,
                    function(yargs) {
                        return yargs
                            .option('v', {
                                alias: 'verbose',
                                required: false,
                                type: 'boolean',
                                describe: 'Prints messages to console.',
                            })
                            .option('f', {
                                alias: 'sourceFiles',
                                required: true,
                                type: 'array',
                                describe: 'Local application log files.',
                                coerce: sourceFiles =>
                                    sourceFiles.map(file => {
                                        return file;
                                    }),
                            })
                            .option('t', {
                                alias: 'infoTypes',
                                required: true,
                                type: 'array',
                                describe: 'Info types.',
                                coerce: infoTypes =>
                                    infoTypes.map(type => {
                                        return {
                                            name: type
                                        };
                                    }),
                            })
                            .example(`node $0 stackdriver-logging files -f resources/file1.txt -t EMAIL_ADDRESS`)
                    },
                    opts =>
                    redactFromExistingFiles(
                        opts.verbose,
                        opts.sourceFiles,
                        opts.infoTypes,
                    )
                )
                .command(
                    `logs`,
                    `Redact sensitive data of the stackdriver logging and send to another stackdriver logging.`,
                    function(yargs) {
                        return yargs
                            .option('v', {
                                alias: 'verbose',
                                required: false,
                                type: 'boolean',
                                describe: 'Prints messages to console.',
                            })
                            .option('l', {
                                alias: 'logNames',
                                required: true,
                                type: 'array',
                                describe: 'log names of stackdriver logging.',
                                coerce: logNames =>
                                    logNames.map(logName => {
                                        return logName;
                                    }),
                            })
                            .option('t', {
                                alias: 'infoTypes',
                                required: true,
                                type: 'array',
                                describe: 'Info types.',
                                coerce: infoTypes =>
                                    infoTypes.map(type => {
                                        return {
                                            name: type
                                        };
                                    }),
                            })
                            .example(`node $0 stackdriver-logging logs -l my-test-log -t EMAIL_ADDRESS`)
                    },
                    opts =>
                    redactFromStackdriverLogs(
                        opts.verbose,
                        opts.logNames,
                        opts.infoTypes,
                    )
                )
                .example(`node $0 stackdriver-logging files -f resources/file1.txt -t EMAIL_ADDRESS`)
                .example(`node $0 stackdriver-logging logs -l my-test-log -t EMAIL_ADDRESS`)
        },
    )
    .example(`node $0 stackdriver-logging files -f resources/file1.txt -t EMAIL_ADDRESS`)
    .example(`node $0 stackdriver-logging logs -l my-test-log -t EMAIL_ADDRESS`)
    .wrap(120)
    .recommendCommands()
    .epilogue(`For more information, see https://cloud.google.com/dlp/docs. Optional flags are explained at https://cloud.google.com/dlp/docs/reference/rest/v2beta1/content/inspect#InspectConfig`);

if (module === require.main) {
    cli.help().strict().argv; // eslint-disable-line
}
