// VARIABLES
const ws = new WebSocket(`ws://${location.hostname}:8080`);

const firstPlace = document.getElementById("first");
const secondPlace = document.getElementById("second");
const thirdPlace = document.getElementById("third");
const passwordModal = document.getElementById("password-modal");
const passwordInput = document.getElementById("password");
const passwordSubmitButton = document.getElementById("password-submit");
const secretWordsInputs = document.getElementById("secret-words");
const endGameTimeInput = document.getElementById("end-game-time");
const enableTimerInput = document.getElementById("enable-timer");
const updateButton = document.getElementById("update-button");
const logsDisplay = document.getElementById("server-logs");

// INIT
passwordModal.style.display = "block";


// WEB SOCKET LOGIC
ws.addEventListener("open", () => {
  console.log("We are connected to the server");
});

ws.addEventListener("message", (message) => {
  const response = JSON.parse(message.data);

  switch (response.type) {
    case "adminConnected":
      console.log(response.message);
      passwordModal.style.display = "none";

      secretWordsInputs.value = response.message.words.join(",");
      enableTimerInput.checked = response.message.gameTimeEnabled;
      endGameTimeInput.value = response.message.endGameTime;
      logsDisplay.innerHTML = response.message.logs.reverse().join("<br>");

      updateTopPlayers(response.message.scores);
      break;

    case "logUpdated":
      logsDisplay.innerHTML = `${response.message.log}<br>${logsDisplay.innerHTML}`;
      break;

    case "scoreUpdate":
      console.log(response.message);

      // Determine 1st, 2nd, 3rd
      updateTopPlayers(response.message.scores);
      break;

    default:
      console.log(response);
      break;
  }
});

function updateTopPlayers(scores) {
  const topPlayers = Object.keys(scores)
    .map(k => scores[k])
    .sort((a,b) => (a.score > b.score) ? 1 : ((b.score > a.score) ? -1 : 0))
    .reverse();

  if (topPlayers.length > 0) {
    firstPlace.innerHTML = `(${topPlayers[0].score}) ${topPlayers[0].name}`;
  }

  if (topPlayers.length > 1) {
    secondPlace.innerHTML = `(${topPlayers[1].score}) ${topPlayers[1].name}`;
  }

  if (topPlayers.length > 2) {
    thirdPlace.innerHTML = `(${topPlayers[2].score}) ${topPlayers[2].name}`;
  }
}

passwordSubmitButton.onclick = function () {
  // Save password
  ws.send(
    JSON.stringify({
      type: "onPasswordConnect",
      message: {
        password: passwordInput.value,
      },
    })
  );
};

updateButton.onclick = function () {
  // Update game settings
  ws.send(
    JSON.stringify({
      type: "onGameSettingsUpdate",
      message: {
        words: secretWordsInputs.value.split(","),
        gameTimeEnabled: enableTimerInput.checked,
        endGameTime: new Date(endGameTimeInput.value).toUTCString(),
      },
    })
  );
};
