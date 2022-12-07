/**
 *
 * Copyright 2015 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

var express = require('express'); // app server
var bodyParser = require('body-parser'); // parser for post requests
var AssistantV2 = require('ibm-watson/assistant/v2'); // watson sdk
const { IamAuthenticator, BearerTokenAuthenticator } = require('ibm-watson/auth');
const actions = require('./bot_operations/actions.js');
const logger = require('./services/logger.js').logger;
var cors = require('cors');

var app = express();

// Bootstrap application settings
app.use(express.static('./public')); // load UI from public folder
app.use(bodyParser.json());
app.use(cors());

let uid;

// Create the service wrapper

let authenticator;
if (process.env.ASSISTANT_IAM_APIKEY) {
  authenticator = new IamAuthenticator({
    apikey: process.env.ASSISTANT_IAM_APIKEY
  });
} else if (process.env.BEARER_TOKEN) {
  authenticator = new BearerTokenAuthenticator({
    bearerToken: process.env.BEARER_TOKEN
  });
}

var assistant = new AssistantV2({
  version: '2019-02-28',
  authenticator: authenticator,
  url: process.env.ASSISTANT_URL,
  disableSslVerification: process.env.DISABLE_SSL_VERIFICATION === 'true' ? true : false
});

// Endpoint to be call from the client side
app.post('/api/message', function (req, res) {
  let assistantId = process.env.ASSISTANT_ID || '<assistant-id>';
  if (!assistantId || assistantId === '<assistant-id>') {
    logger.log('error', 'Server error message displayed to user - Watson configuration error (E.g.: ASSISTANT_ID not set)');

    return res.json({
      output: {
        text:
          'Sorry, I am having trouble connecting to the server. Try refreshing the page.',
      },
    });
  }

  var textIn = '';

  if (req.body.input) {
    textIn = req.body.input.text;
  }

  var payload = {
    assistantId: assistantId,
    sessionId: req.body.session_id,
    input: {
      message_type: 'text',
      text: textIn,
      options: {
        return_context: true
      }
    },
    context: req.body.context
  };

  // Send the input to the assistant service
  assistant.message(payload, async function (err, data) {
    if (err) {
      const status = err.code !== undefined && err.code > 0 ? err.code : 500;
      return res.status(status).json(err);
    }

    if (data.result.output.actions) {
      let result = data.result;

      let actionResultResponse = await actions.handleActions(result.output.actions[0], uid);
      let actionResultKey = Object.keys(actionResultResponse)[0], actionResultValue = Object.values(actionResultResponse)[0];

      if (result.context.skills['main skill'].user_defined) {
        result.context.skills['main skill'].user_defined[actionResultKey] = actionResultValue;
      } else {
        result.context.skills['main skill'].user_defined = { [actionResultKey]: actionResultValue };
      }

      if (result.output.actions[0].name == 'showMultipleOptions') {
        let actionResult = await actions.handleActions(result.output.actions[0]);

        if (actionResult.display_response) {
          let displayResponse = actionResult.display_response;
          if (result.output.generic) {
            displayResponse.forEach(function (gen) {
              result.output.generic.push(gen);
            });
          } else {
            result.output.generic = displayResponse;
          }
        }
      }

    }

    return res.json(data);
  });
});

app.get('/api/session', function (req, res) {
  assistant.createSession(
    {
      assistantId: process.env.ASSISTANT_ID || '{assistant_id}',
    },
    function (error, response) {
      if (error) {
        logger.log('error', `Error while creating session: ${error}`);
        return res.send(error);
      } else {
        uid = req.query.uid;
        //logger.log('info', `New user session created. Session ID: ${response.result.session_id}`);
        return res.send(response);
      }
    }
  );
});

module.exports = app;
