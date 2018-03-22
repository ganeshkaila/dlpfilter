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
 **/

'use strict';

var Logger = require('./lib/logger.js');
// Imports the DLP Logger library
var DlpLogger = require('./lib/dlpfilterLogging.js');

var logger = new Logger.Logger();
// Instantiates a dlpLogger instance
var dlpLogger = new DlpLogger.DlpLogger();

// The infoTypes of information to redact
const infoTypes = [{
    name: 'EMAIL_ADDRESS'
}, {
    name: 'PHONE_NUMBER'
}, {
    name: 'PERSON_NAME'
}];

const opts = {
    end: {
        end: true
    },
    verbose: true
};

var logText = 'My name is Robert, My email address is rob@email.com';

if (process.argv.length === 2) {
    logger.info(logText, opts, () => {});
    dlpLogger.info(logText, opts, infoTypes, () => {});
} else if (process.argv.length === 3) {
    logger.info(process.argv[2], opts, () => {});
    dlpLogger.info(process.argv[2], opts, infoTypes, () => {});
} else {
    console.log(
        'Usage: ' +
        '\n\tnode app.js' +
        '\n\tnode app.js "My name is Robert, My email address is rob@email.com."'
    );
}
