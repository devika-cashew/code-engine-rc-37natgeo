// The ConversationPanel module is designed to handle
// all display and behaviors of the conversation column of the app.
/* eslint no-unused-vars: "off" */
/* global Api: true, Common: true*/

var ConversationPanel = (function () {
  var settings = {
    selectors: {
      chatBox: '#scrollingChat',
      fromUser: '.from-user',
      fromWatson: '.from-watson',
      latest: '.latest'
    },
    authorTypes: {
      user: 'user',
      watson: 'watson'
    }
  };

  // Publicly accessible methods defined
  return {
    launchBot: launchBot,
    init: init,
    inputKeyDown: inputKeyDown,
    sendMessage: sendMessage,
    clickSend: clickSend
  };

  function launchBot(text) {
    if (document.getElementById("quick-replies")) {
      document.getElementById("quick-replies").remove();
    }
    $("#input-holder").show();
    $("#textInput").removeAttr("disabled");
    $("#scrollingChat").append(`<div class="segments load"><div class="from-user latest top"><div class="message-inner"><p>${text}</p></div></div></div>`);
    init();
  }

  // Initialize the module
  function init() {
    chatUpdateSetup();

    Api.getSessionId(function () {
      Api.sendRequest('', null);
    });
    setupInputBox();
  }
  // Set up callbacks on payload setters in Api module
  // This causes the displayMessage function to be called when messages are sent / received
  function chatUpdateSetup() {
    var currentRequestPayloadSetter = Api.setRequestPayload;
    Api.setRequestPayload = function (newPayloadStr) {
      currentRequestPayloadSetter.call(Api, newPayloadStr);
      displayMessage(JSON.parse(newPayloadStr), settings.authorTypes.user);
    };

    var currentResponsePayloadSetter = Api.setResponsePayload;

    Api.setResponsePayload = function (newPayloadStr) {
      currentResponsePayloadSetter.call(Api, newPayloadStr);
      displayMessage(JSON.parse(newPayloadStr).result, settings.authorTypes.watson);

      //console.log(JSON.stringify(JSON.parse(newPayloadStr).result.output, null, 2));
      //To handle action responses
      var parsedNewPayloadStr = JSON.parse(newPayloadStr);
      var result = parsedNewPayloadStr.result;
      if (result.output) {
        if (result.output.actions) {
          if (result.output.actions[0].name == 'saveTaskInfo') {
            //if(result.)
            console.log(JSON.stringify(result, null, 2));
            if (result.context.skills['main skill'].user_defined.save_task_info_result &&
              result.context.skills['main skill'].user_defined.save_task_info_result != null) {
              (window["ReactNativeWebView"] || window).postMessage(result.context.skills['main skill'].user_defined.save_task_info_result);
              window.parent.postMessage(result.context.skills['main skill'].user_defined.save_task_info_result, '*');
            }
            if (result.output.actions[0].parameters.skip_user_input) {
              Api.sendRequest('', result.context);
            }
          }

          else if (result.output.actions[0].name == 'showTextbox') {
            $("#input-holder").show();
            $("#textInput").attr("placeholder", result.output.actions[0].parameters.placeholder);

            if (result.output.actions[0].parameters.minlength)
              $("#textInput").attr("minlength", result.output.actions[0].parameters.minlength);
          }
        }
      }
    };

    Api.setErrorPayload = function (newPayload) {
      displayMessage(newPayload, settings.authorTypes.watson);
    };
  }

  // Set up the input box to underline text as it is typed
  // This is done by creating a hidden dummy version of the input box that
  // is used to determine what the width of the input text should be.
  // This value is then used to set the new width of the visible input box.
  function setupInputBox() {
    //var input = document.getElementById('textInput');
    //var dummy = document.getElementById('textInputDummy');
    var minFontSize = 14;
    var maxFontSize = 16;
    var minPadding = 4;
    var maxPadding = 6;

    // If no dummy input box exists, create one
    /*  if (dummy === null) {
        var dummyJson = {
          'tagName': 'div',
          'attributes': [{
            'name': 'id',
            'value': 'textInputDummy'
          }]
        };
  
        dummy = Common.buildDomElement(dummyJson);
        document.body.appendChild(dummy);
      }*/

    /*function adjustInput() {
      if (input.value === '') {
        // If the input box is empty, remove the underline
        input.classList.remove('underline');
      } else {
        // otherwise, adjust the dummy text to match, and then set the width of
        // the visible input box to match it (thus extending the underline)
        input.classList.add('underline');
        var txtNode = document.createTextNode(input.value);
        ['font-size', 'font-style', 'font-weight', 'font-family', 'line-height',
          'text-transform', 'letter-spacing'
        ].forEach(function (index) {
          dummy.style[index] = window.getComputedStyle(input, null).getPropertyValue(index);
        });
        dummy.textContent = txtNode.textContent;
        dummy.setAttribute('style', 'width:' + '50rem');
        dummy.style.width = '50rem';

        var padding = 0;
        var htmlElem = document.getElementsByTagName('html')[0];
        var currentFontSize = parseInt(window.getComputedStyle(htmlElem, null).getPropertyValue('font-size'), 10);
        if (currentFontSize) {
          padding = Math.floor((currentFontSize - minFontSize) / (maxFontSize - minFontSize) *
            (maxPadding - minPadding) + minPadding);
        } else {
          padding = maxPadding;
        }
      }
    }*/

    // Any time the input changes, or the window resizes, adjust the size of the input box
    //input.addEventListener('input', adjustInput);
    //window.addEventListener('resize', adjustInput);

    // Trigger the input event once to set up the input box and dummy element
    //Common.fireEvent(input, 'input');
  }

  // Display a user or Watson message that has just been sent/received
  function displayMessage(newPayload, typeValue) {
    var isUser = isUserMessage(typeValue);
    //var textExists = newPayload.generic;
    if ((newPayload.output && newPayload.output.generic) || newPayload.input) {
      // Create new message generic elements
      var responses = buildMessageDomElements(newPayload, isUser);
      var chatBoxElement = document.querySelector(settings.selectors.chatBox);
      var previousLatest = chatBoxElement.querySelectorAll((isUser ? settings.selectors.fromUser : settings.selectors.fromWatson) +
        settings.selectors.latest);
      // Previous "latest" message is no longer the most recent
      if (previousLatest) {
        Common.listForEach(previousLatest, function (element) {
          element.classList.remove('latest');
        });
      }
      setResponse(responses, isUser, chatBoxElement, 0, true);
    }
  }

  // Recurisive function to add responses to the chat area
  function setResponse(responses, isUser, chatBoxElement, index, isTop) {
    if (index < responses.length) {
      var res = responses[index];
      if (res.type !== 'pause') {
        var currentDiv = getDivObject(res, isUser, isTop);

        chatBoxElement.appendChild(currentDiv);
        // Class to start fade in animation
        currentDiv.classList.add('load');
        // Move chat to the most recent messages when new messages are added
        setTimeout(function () {
          // wait a sec before scrolling
          scrollToChatBottom();
        }, 1);
        setResponse(responses, isUser, chatBoxElement, index + 1, false);
      } else {
        //var userTypringField = document.getElementById('user-typing-field');
        /* if (res.typing) {
           userTypringField.innerHTML = 'DiscoveryBot is typing...';
         }*/
        setTimeout(function () {
          //userTypringField.innerHTML = '';
          setResponse(responses, isUser, chatBoxElement, index + 1, isTop);
        }, res.time);
      }
    }
  }

  // Constructs new DOM element from a message
  function getDivObject(res, isUser, isTop) {
    var classes = [(isUser ? 'from-user' : 'from-watson'), 'latest', (isTop ? 'top' : 'sub')];
    if (!res.innerstyle || !res.hasOwnProperty('innerstyle')) {
      res.innerstyle = 'message-inner';
    }

    var messageJson;
    if (!isUser && isTop) {
      messageJson = {
        // <div class='segments'>
        'tagName': 'div',
        'classNames': ['segments'],
        'attributes': (res.id || res.hasOwnProperty('id')) ? [{ 'name': 'id', 'value': res.id || null }] : {},
        'children': [
          {
            // div class="bot-icon-div"
            'tagName': 'div',
            'classNames': ['bot-icon-div'],
            'children': [{
              'tagName': 'div',
              'children': [{
                'tagName': 'img',
                'classNames': ['bot-icon'],
                'attributes': [{ name: 'src', value: '../img/robo-logo.png' }]
              }]
            }]
          },
          {
            // <div class='from-user/from-watson latest'>
            'tagName': 'div',
            'classNames': classes,
            'children': [{
              // <div class='message-inner'>
              'tagName': 'div',
              'classNames': [res.innerstyle],
              'children': [{
                // <p>{messageText}</p>
                'tagName': 'p',
                'text': res.innerhtml
              }]
            }]
          }]
      };
    } else {
      messageJson = {
        // <div class='segments'>
        'tagName': 'div',
        'classNames': ['segments'],
        'attributes': (res.id || res.hasOwnProperty('id')) ? [{ 'name': 'id', 'value': res.id || null }] : {},
        'children': [
          {
            // <div class='from-user/from-watson latest'>
            'tagName': 'div',
            'classNames': classes,
            'children': [{
              // <div class='message-inner'>
              'tagName': 'div',
              'classNames': (res.innerstyle).split(' '),
              'children': [{
                // <p>{messageText}</p>
                'tagName': 'p',
                'text': res.innerhtml
              }]
            }]
          }]
      };
    }

    return Common.buildDomElement(messageJson);
  }

  // Checks if the given typeValue matches with the user "name", the Watson "name", or neither
  // Returns true if user, false if Watson, and null if neither
  // Used to keep track of whether a message was from the user or Watson
  function isUserMessage(typeValue) {
    if (typeValue === settings.authorTypes.user) {
      return true;
    } else if (typeValue === settings.authorTypes.watson) {
      return false;
    }
    return null;
  }

  function getOptions(optionsList, preference) {
    var list = '';
    var i = 0;
    if (optionsList !== null) {
      if (preference === 'text') {
        list = '<ul>';
        for (i = 0; i < optionsList.length; i++) {
          if (optionsList[i].value) {
            list += '<li><div class="options-list" onclick="ConversationPanel.sendMessage(\'' +
              optionsList[i].value.input.text + '\');" >' + optionsList[i].label + '</div></li>';
          }
        }
        list += '</ul>';
      } else if (preference === 'button') {
        for (i = 0; i < optionsList.length; i++) {
          if (optionsList[i].value) {
            var text = optionsList[i].value.input.text.replace(/'/g, "\\'");
            let label = optionsList[i].label;
            let item;
            if (label.includes('<img')) {
              item = '<div class="options-button-image-holder" onclick="ConversationPanel.sendMessage(\'' +
                text + '\');" >' + label + '</div>';
            } else {
              item = '<div class="options-button" onclick="ConversationPanel.sendMessage(\'' +
                text + '\');" >' + label + '</div>';
            }
            list += item;
          }
        }
      }
    }
    return list;
  }

  function getCarouselItems(data) {
    let itemsList = '';
    for (i = 0; i < data.length; i++) {
      itemsList +=
        `<div class="mySlide" id="slide-${i + 1}" onclick="window.open('${data[i].Deeplink}');">
        <div class="slide-img-holder">
          <img class="slide-img" src="${data[i].Image}">
        </div>
      </div>`;
    }

    let carouselHTML = `<div class="slider"><div class="slides">${itemsList}</div></div>`

    return carouselHTML;
  }

  function getResponse(responses, gen) {
    var title = '', description = '';
    if (gen.hasOwnProperty('title') && gen.title.trim != '') {
      title = gen.title;
    }
    if (gen.hasOwnProperty('description')) {
      description = '<div>' + gen.description + '</div>';
    }
    if (gen.response_type === 'image') {
      var img = '<div><img src="' + gen.source + '" width="300"></div>';
      responses.push({
        type: gen.response_type,
        innerhtml: title + description + img,
        innerstyle: 'message-inner'
      });
    } else if (gen.response_type === 'text') {
      gen.text = gen.text.replace(/(?:\r\n|\r|\n)/g, '<br>');
      responses.push({
        type: gen.response_type,
        innerhtml: gen.text,
        innerstyle: 'message-inner'
      });
    } else if (gen.response_type === 'audio') {
      console.log(gen.source);
      responses.push({
        type: gen.response_type,
        innerhtml: `<audio controls preload="none" src="${gen.source}" type="audio/ogg">Your browser does not support the audio element.</audio>`,
        innerstyle: 'message-inner-video'
      });
    } else if (gen.response_type === 'pause') {
      responses.push({
        type: gen.response_type,
        time: gen.time,
        typing: gen.typing,
        innerstyle: 'message-inner'
      });
    } else if (gen.response_type === 'option') {
      var preference = 'button';
      if (gen.hasOwnProperty('preference')) {
        preference = gen.preference;
      }

      var list = getOptions(gen.options, preference);

      if (title.trim() != '' && description.trim() != '') {
        responses.push({
          type: 'text',
          innerhtml: title + description,
          innerstyle: 'message-inner'
        });
      }
      responses.push({
        id: 'quick-replies',
        type: gen.response_type,
        innerhtml: list,
        innerstyle: 'message-inner2'
      });
    } else if (gen.response_type === 'carousel') {

      let itemsList = getCarouselItems(gen.data);
      responses.push({
        id: 'carousel',
        type: gen.response_type,
        innerhtml: itemsList,
        innerstyle: 'message-inner-carousel'
      });
    }
  }

  // Constructs new generic elements from a message payload
  function buildMessageDomElements(newPayload, isUser) {
    var textArray = isUser ? newPayload.input.text : newPayload.output.text;
    if (Object.prototype.toString.call(textArray) !== '[object Array]') {
      textArray = [textArray];
    }

    var responses = [];

    if (newPayload.hasOwnProperty('output')) {
      if (newPayload.output.hasOwnProperty('generic')) {

        var generic = newPayload.output.generic;

        generic.forEach(function (gen) {
          getResponse(responses, gen);
        });
      }
    } else if (newPayload.hasOwnProperty('input')) {
      var input = '';
      textArray.forEach(function (msg) {
        input += msg + ' ';
      });
      input = input.trim()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      if (input.length !== 0) {
        responses.push({
          type: 'text',
          innerhtml: input
        });
      }
    }
    return responses;
  }

  // Scroll to the bottom of the chat window
  function scrollToChatBottom() {
    var scrollingChat = document.querySelector('#scrollingChat');
    scrollingChat.scrollTop = scrollingChat.scrollHeight;
  }

  function disableSendButton() {
    $("#sendIcon").prop("disabled", true);
  }

  function sendMessage(text, context) {
    if (document.getElementById("quick-replies")) {
      document.getElementById("quick-replies").remove();
    }
    if (document.getElementById("cashew-video")) {
      document.getElementById("cashew-video").remove();
    }

    disableSendButton();
    // Send the user message
    Api.sendRequest(text, context);
  }

  // Handles the submission of input
  function inputKeyDown(event, inputBox) {
    // Submit on enter key, dis-allowing blank messages
    if (event.keyCode === 13 && inputBox.value) {
      let context;
      let latestResponse = Api.getResponsePayload();
      if (latestResponse) {
        context = latestResponse.context;
      }

      $("#input-holder").hide();
      sendMessage(inputBox.value, context);

      // Clear input box for further messages
      inputBox.value = '';
      Common.fireEvent(inputBox, 'input');
    }
  }

  function clickSend() {
    // Submit on enter key, dis-allowing blank messages
    let context;
    let inputBox = document.getElementById("textInput");
    let latestResponse = Api.getResponsePayload();
    if (latestResponse) {
      context = latestResponse.context;
    }

    $("#input-holder").hide();
    sendMessage(inputBox.value, context);

    // Clear input box for further messages
    inputBox.value = '';
    Common.fireEvent(inputBox, 'input');
  }
}());
