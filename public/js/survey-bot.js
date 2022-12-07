$(document).ready(function() {
  //window.parent.postMessage('Hello Parent!', '*');
  const urlParams = new URLSearchParams(window.location.search);
  let roboUID = urlParams.get('roboUID');
  localStorage.setItem('roboUID', roboUID);

  ConversationPanel.init();
  var currentDateTime = new Date();
  let date = getDateString(currentDateTime);
  let time = currentDateTime.toLocaleTimeString('en-US', { hour: 'numeric', minute:'2-digit', hour12: true });
  let finalString = date + ' ' + time;
  $("#timestamp").append(`${finalString}`);  

  //$("#sendIcon").prop("disabled", true);
  $("#input-holder").hide();
  $("#input-holder-multi-select").hide();
      //$("#textInput").attr("disabled", "disabled");
});

$("#textInput").on("keyup", function() {
  $("#sendIcon").prop("disabled", false);
  if($("#textInput").val().trim() == '') {devika
    $("#sendIcon").prop("disabled", true);
  }
});  

function getDateString(d) {
  var today = new Date();
  if(d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && 
          d.getFullYear() === today.getFullYear()) {
      return 'Today at';
  } else if((d.getDate() === today.getDate()-1) && (d.getMonth() === today.getMonth() - 1) && 
          (d.getFullYear() === today.getFullYear())) {
      return 'Yesterday at';
  } else {
      let formattedDate = d.toLocaleDateString('en-GB', {
          day: 'numeric', month: 'short', year: 'numeric'
        }).replace(/ /g, ' ');
      return formattedDate;
  }
}

