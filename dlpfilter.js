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

// Imports the nodejslibraries
const fs = require('fs');
const Tail = require('always-tail');
const mime = require('mime');
const Buffer = require('safe-buffer').Buffer;

// Imports the Google Cloud Data Loss Prevention library
const DLP = require('@google-cloud/dlp');

// Imports the Logger library
const Logger = require('./lib/logger.js');

// The infoTypes of information to redact
// const infoTypes = [{ name: 'EMAIL_ADDRESS' }, { name: 'PHONE_NUMBER' }];

// The minimum likelihood required before redacting a match
const minLikelihood = 'LIKELIHOOD_UNSPECIFIED';

function redactFromExistingFiles(sourceFiles, infoTypes) {
  // Instantiates a client
  const dlp = new DLP.DlpServiceClient();
  const logger = new Logger.Logger();

  const fileItems = sourceFiles.map(file => {
    return {
      type: mime.getType(file) || 'application/octet-stream',
      data: Buffer.from(fs.readFileSync(file)).toString('base64'),
    };
  });

  const streamRedactionConfigs = infoTypes.map(infoType => {
    return {
      infoType: infoType,
      replaceWith: 'REDACTED',
    };
  });

  /****************************************************
  * Redact the existing content from the files.
  ****************************************************/
  const fileRequest = {
    inspectConfig: {
      minLikelihood: minLikelihood,
    },
    replaceConfigs: streamRedactionConfigs,
    items: fileItems,
  };

  dlp
    .redactContent(fileRequest)
    .then(body => {
      body[0].items.map(item => {
        logger.info(item.data.toString(), () => {});
      });
    })
    .catch(err => {
      console.log(`Error in redactStream: ${err.message || err}`);
    });

    /****************************************************
    * Redact the tailing content from the files.
    ****************************************************/
    sourceFiles.forEach(function(file) {
      new Tail(file, '\n')
        .on('line', function(string) {
          const items = [{type: 'text/plain', value: string}];

          const stringRequest = {
            inspectConfig: {
              minLikelihood: minLikelihood,
            },
            replaceConfigs: streamRedactionConfigs,
            items: items,
          };

          dlp
            .redactContent(stringRequest)
            .then(body => {
              body[0].items.map(item => {
                logger.info(item.value.toString(), () => {});
              });
            })
            .catch(err => {
              console.log(`Error in redactStream: ${err.message || err}`);
            });
        });
    });
}

const cli = require(`yargs`)
  .demand(1)
  .command(
    `stackdriver-logging files`,
    `Redact sensitive data from the existing log files using the Data Loss Prevention API.`,
    function (yargs) {
      return yargs
        .option('f', {
            alias: 'sourceFiles',
            required:  true,
            type: 'array',
            coerce: sourceFiles =>
              sourceFiles.map(file => {
                return file;
              }),
        })
        .option('t', {
          alias: 'infoTypes',
          required:  true,
          type: 'array',
          coerce: infoTypes =>
            infoTypes.map(type => {
              return {name: type};
            }),
        })
    },
    opts =>
      redactFromExistingFiles(
        opts.sourceFiles,
        opts.infoTypes,
      )
  )
  .example(`node $0 stackdriver-logging files -f resources/file1.txt resources/file2.txt -t EMAIL_ADDRESS`)
  .wrap(120)
  .recommendCommands()
  .epilogue(`For more information, see https://cloud.google.com/dlp/docs. Optional flags are explained at https://cloud.google.com/dlp/docs/reference/rest/v2beta1/content/inspect#InspectConfig`);

if (module === require.main) {
  cli.help().strict().argv; // eslint-disable-line
}

