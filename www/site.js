// VARIABLES
const ws = new WebSocket(`ws://${location.hostname}:8080`);
let username = localStorage.getItem("name");
let answerTimeout = null;
let countdownInterval = null;

const helpModal = document.getElementById("help-modal");
const nameModal = document.getElementById("name-modal");
const helpButton = document.getElementById("help-button");
const closeHelpModalButton = document.getElementById("help-close");
const nameSubmitButton = document.getElementById("name-submit");
const nameInput = document.getElementById("name");
const nameDisplay = document.getElementById("name-display");
const firstPlace = document.getElementById("first");
const secondPlace = document.getElementById("second");
const thirdPlace = document.getElementById("third");
const answer = document.getElementById("answer");
const notInListDisplay = document.getElementById("not-in-list");
const countdownTimer = document.getElementById("countdown-timer");

// INIT
helpModal.style.display = "block";
if (username != null && username != "") {
    nameDisplay.innerHTML = username;
}
toastr.options = {
    "closeButton": false,
    "debug": false,
    "newestOnTop": true,
    "progressBar": true,
    "positionClass": "toast-top-left",
    "preventDuplicates": false,
    "onclick": null,
    "showDuration": "100",
    "hideDuration": "300",
    "timeOut": "7000",
    "extendedTimeOut": "7000",
    "showEasing": "swing",
    "hideEasing": "linear",
    "showMethod": "slideDown",
    "hideMethod": "slideUp"
}


// WEB SOCKET LOGIC
ws.addEventListener("open", () => {
  console.log("We are connected to the server");

  ws.send(
    JSON.stringify({
      type: "onJoin",
      message: {
        name: username || "Unknown",
      },
    })
  );
});

ws.addEventListener("message", (message) => {
  const response = JSON.parse(message.data);

  switch (response.type) {
    case "gameRestarted":
      toastr.info("Game reset by admin");
      resetInputs();
      updateAnswerDisplay("GAME RESET, GO!");
      updateTopPlayers(response.message.scores);
      handleTimerUpdate(response.message.timer);
      break;

    case "submitWordResponse":
      console.log(response.message);

      if (response.message.gameOver) {
        updateAnswerDisplay(`GAME OVER!`, -1);
        gameOver = true;

        updateGuessesAndKeysFromResponse(response.message.letters, response.message.submission);
        return;
      }

      if (response.message.success) {
        resetInputs();
        updateAnswerDisplay(`${response.message.submission.toUpperCase()}, NICE!`);
        return;
      }

      if (response.message.success == false && currentAnswerRow > 6) {
        resetInputs();
        updateAnswerDisplay(`IT WAS "${response.message.answer.toUpperCase()}", NEXT WORD...`);
        return;
      }

      if (response.message.validWord) {
        updateGuessesAndKeysFromResponse(response.message.letters, response.message.submission);
      } else {
        // console.log("The word is not a valid 5 letter word");
        currentAnswerRow--;
        currentAnswerColumn = 6;
        answerBuffer = response.message.submission.split("");
        document
          .getElementById(`guess-${currentAnswerRow}`)
          .classList.add("guess-invalid");
        notInListDisplay.style.opacity = "1";

        setTimeout(() => {
          document
            .getElementById(`guess-${currentAnswerRow}`)
            .classList.remove("guess-invalid");
        }, 1000);

        setTimeout(() => {
          notInListDisplay.style.opacity = "0";
        }, 3000);
      }
      break;


    case "scoreUpdate":
      console.log(response.message);
      const latestScore = response.message.latestScore;

      handleTimerUpdate(response.message.timer);

      if (latestScore.player) {
        const playerScored = response.message.scores[latestScore.player];
        const updateMessage = `<b>${playerScored.name}</b> got a word`;
        toastr.success(updateMessage);
      }

      // Determine 1st, 2nd, 3rd
      updateTopPlayers(response.message.scores);
      break;

    default:
      console.log(response);
      break;
  }
});

function updateGuessesAndKeysFromResponse(letters, submission) {
  for (let i = 0; i < letters.length; i++) {
    const correctness = letters[i];
    document
      .getElementById(`guess-${currentAnswerRow - 1}-${i + 1}`)
      .classList.add(correctness);

    const letter = submission[i].toLowerCase();
    switch (correctness) {
      case "correct":
        document
          .getElementById(`key-${letter}`)
          .classList.add(`key-${correctness}`);
        lettersInCorrectPosition.push(letter);
        break;

      case "wrong":
        if (lettersInCorrectPosition.indexOf(letter) < 0) {
          document
            .getElementById(`key-${letter}`)
            .classList.add(`key-${correctness}`);
          lettersInWrongPosition.push(letter);
        }
        break;

      case "missing":
        if (
          lettersInCorrectPosition.indexOf(letter) < 0 &&
          lettersInWrongPosition.indexOf(letter) < 0
        ) {
          document
            .getElementById(`key-${letter}`)
            .classList.add(`key-${correctness}`);
        }
        break;

      default:
        break;
    }
  }
}

function resetInputs() {
  lettersNotInWord = [];
  lettersInWrongPosition = [];
  lettersInCorrectPosition = [];
  gameOver = false;
  currentAnswerRow = 1;
  currentAnswerColumn = 1;
  answerBuffer = [];

  Array.from(document.getElementsByClassName('guess-block'))
    .forEach(el => {
      el.innerHTML = '';
      el.classList.remove("correct");
      el.classList.remove("missing");
      el.classList.remove("wrong");
    });
    
  Array.from(document.getElementsByClassName('key-block'))
    .forEach(el => {
      el.classList.remove("key-correct");
      el.classList.remove("key-missing");
      el.classList.remove("key-wrong");
    });
}

function handleTimerUpdate(timer) {
  if (!timer) {
    return;
  }

  clearInterval(countdownInterval);
  if (!timer.enabled) {
    countdownTimer.innerHTML = "";
    return;
  }

  console.log(`Timer is ${timer.time}`);
  const countDownDate = new Date(timer.time).getTime();

  // Update the count down every 1 second
  countdownInterval = setInterval(function() {
    const now = new Date().getTime();
    const distance = countDownDate - now;

    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    countdownTimer.innerHTML = `Time Remaining: ${minutes}m ${seconds}s`;

    if (distance < 0) {
      clearInterval(countdownInterval);
      countdownTimer.innerHTML = "DONE";
      gameOver = true;
    }
  }, 1000);
}

function updateAnswerDisplay(message, timer=5000) {
  answer.innerHTML = message;
  answer.style.opacity = "1";

  if (answerTimeout) {
    clearTimeout(answerTimeout);
  }

  if (timer > 0) {
    answerTimeout = setTimeout(() => {
      answer.style.opacity = "0";
    }, timer);
  }
}

function updateTopPlayers(scores) {
  const topPlayers = Object.keys(scores)
    .map(k => scores[k])
    .sort((a,b) => (a.score > b.score) ? 1 : ((b.score > a.score) ? -1 : 0))
    .reverse();

  firstPlace.innerHTML = `(${topPlayers[0].score}) ${topPlayers[0].name}`;

  if (topPlayers.length > 1) {
    secondPlace.innerHTML = `(${topPlayers[1].score}) ${topPlayers[1].name}`;
  }

  if (topPlayers.length > 2) {
    thirdPlace.innerHTML = `(${topPlayers[2].score}) ${topPlayers[2].name}`;
  }
}


// GAME LOGIC
let lettersNotInWord = [];
let lettersInWrongPosition = [];
let lettersInCorrectPosition = [];
let gameOver = false;
let currentAnswerRow = 1;
let currentAnswerColumn = 1;
let answerBuffer = [];

function addLetter(letter) {
  if (gameOver || currentAnswerColumn == 6) {
    return;
  }

  //console.log(`guess-${currentAnswerRow}-${currentAnswerColumn}`);
  document.getElementById(
    `guess-${currentAnswerRow}-${currentAnswerColumn}`
  ).innerHTML = letter;
  answerBuffer.push(letter);
  currentAnswerColumn++;
}

function removeLetter() {
  if (gameOver) {
    return;
  }

  currentAnswerColumn--;
  if (currentAnswerColumn < 1) {
    currentAnswerColumn = 1;
  }

  //console.log(`guess-${currentAnswerRow}-${currentAnswerColumn}`);
  document.getElementById(
    `guess-${currentAnswerRow}-${currentAnswerColumn}`
  ).innerHTML = "";
  answerBuffer.pop();
}

function submitWord() {
  if (currentAnswerColumn < 6) {
    return;
  }

  // Check if answer correct with websocket
  ws.send(
    JSON.stringify({
      type: "submitWord",
      message: {
        word: answerBuffer.join(""),
      },
    })
  );
  console.log(`Sending ${answerBuffer.join("")}...`);

  currentAnswerColumn = 1;
  currentAnswerRow++;
  answerBuffer = [];
}

document.querySelectorAll(".key-block").forEach((el) => {
  if (el.innerText.length == 1) {
    // Letter selected
    el.onclick = (e) => {
      const letterSelected = e.srcElement.innerText.toLowerCase();
      addLetter(letterSelected);
    };
  }
});

document.getElementById("key-delete").onclick = (e) => {
  removeLetter();
};

document.getElementById("key-enter").onclick = (e) => {
  submitWord();
};

document.onkeydown = function (e) {
  if (areModalsVisible()) {
    // TODO: Allow users to hit Enter when entering their name
    return;
  }

  e = e || window.event;
  switch (e.key) {
    case "Enter":
      submitWord();
      break;

    case "Backspace":
      removeLetter();
      break;

    default:
      if (/^[a-z]$/.test(e.key)) {
        addLetter(e.key);
      }
      break;
  }
};


// MODAL LOGIC
helpButton.onclick = function () {
  helpModal.style.display = "block";
};

nameSubmitButton.onclick = function () {
  let name = nameInput.value;
  // Sanitize name
  name = name.replace(/[^a-zA-Z 0-9]/g, "")

  // Save name
  ws.send(
    JSON.stringify({
      type: "onNameUpdate",
      message: {
        name: name,
      },
    })
  );
  username = name;
  localStorage.setItem("name", name);
  nameDisplay.innerHTML = name;

  hideNameModal();
};

closeHelpModalButton.onclick = function () {
  hideHelpModal();
};

nameDisplay.onclick = function () {
    nameInput.value = username;
    showNameModal();
};

// When the user clicks anywhere outside of the modal, close the modal
window.onclick = function (event) {
  if (event.target == helpModal) {
    hideHelpModal();
  }
  if (event.target == nameModal) {
    // Do nothing, force user to enter a name
  }
};

function areModalsVisible() {
  return (
    helpModal.style.display == "block" || nameModal.style.display == "block"
  );
}

function hideHelpModal() {
  helpModal.style.display = "none";

  if (username == null || username == "") {
    showNameModal();
  }
}

function showNameModal() {
  nameModal.style.display = "block";
}

function hideNameModal() {
  nameModal.style.display = "none";
}

window.onbeforeunload = function() {
  return "Data will be lost if you leave the page, are you sure?";
};
