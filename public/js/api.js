// The Api module is designed to handle all interactions with the server

var Api = (function() {
  var requestPayload;
  var responsePayload;
  var messageEndpoint = '/api/message';

  var sessionId = null;

  // Publicly accessible methods defined
  return {
    sendRequest: sendRequest,
    getSessionId: getSessionId,

    // The request/response getters/setters are defined here to prevent internal methods
    // from calling the methods without any of the callbacks that are added elsewhere.
    getRequestPayload: function() {
      return requestPayload;
    },
    setRequestPayload: function(newPayloadStr) {
      requestPayload = JSON.parse(newPayloadStr);
    },
    getResponsePayload: function() {
      return responsePayload;
    },
    setResponsePayload: function(newPayloadStr) {
      responsePayload = JSON.parse(newPayloadStr).result;
    },
    setErrorPayload: function() {
    }
  };

  function getSessionId(callback) {
    var http = new XMLHttpRequest();
    let roboUID = localStorage.getItem('roboUID');
    var sessionEndpoint = `/api/session?uid=${roboUID}`;
    http.open('GET', sessionEndpoint, true);
    http.setRequestHeader('Content-type', 'application/json');
    http.onreadystatechange = function () {
      if (http.readyState === XMLHttpRequest.DONE) {
        let res = JSON.parse(http.response);
        sessionId = res.result.session_id;
        callback();
      }
    };
    http.send();
  }


  // Send a message request to the server
  function sendRequest(text, context) {
    // Build request payload
    var payloadToWatson = {
      session_id: sessionId,
      context: context
    };

    payloadToWatson.input = {
      message_type: 'text',
      text: text,
    };


    // Built http request
    var http = new XMLHttpRequest();
    http.open('POST', messageEndpoint, true);
    http.setRequestHeader('Content-type', 'application/json');
    http.onreadystatechange = function() {
      if (http.readyState === XMLHttpRequest.DONE && http.status === 200 && http.responseText) {
        Api.setResponsePayload(http.responseText);
      } else if (http.readyState === XMLHttpRequest.DONE && http.status !== 200) {
        let errorMessageList = [
          'Sorry. I am having trouble connecting to the server. Sometimes this means, you just need to refresh the page.',
          'I seem to have trouble connecting to the server. You could try refreshing the page.',
        ];
        let randomErrorMessage = errorMessageList[Math.floor(Math.random() * errorMessageList.length)];
        Api.setErrorPayload({
          'output': {
            'generic': [
              {
                'response_type': 'text',
                'text': randomErrorMessage
              }
            ],
          }
        });
        console.log('\nServer error message displayed to user');
      }
    };

    var params = JSON.stringify(payloadToWatson);
    // Stored in variable (publicly visible through Api.getRequestPayload)
    // to be used throughout the application
    if (Object.getOwnPropertyNames(payloadToWatson).length !== 0) {
      Api.setRequestPayload(params);
    }

    // Send request
    http.send(params);
  }
}());
