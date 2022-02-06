// Importing the required modules
const WebSocketServer = require('ws');
const fs = require('fs');
const { 
    v4: uuidv4,
  } = require('uuid');
  
// Creating a new websocket server
const five_letter_words = fs.readFileSync('five_letter_words.txt').toString().split("\n");
const wss = new WebSocketServer.Server({ port: 8080 });

const adminPassword = "admin";
let players = {};
let admins = [];
let secretWords = ["space","small","trail","wraps"];
let gameTimeEnabled = false;
let endGameTime = '';
let logs = [];

// Helper functions
const objectMap = (obj, fn) =>
    Object.fromEntries(
        Object.entries(obj).map(
        ([k, v], i) => [k, fn(v, k, i)]
        )
    );

function appendToLogs(message) {
    console.log(message);
    logs.push(message);

    if (logs.length > 50) {
        logs.shift();
    }

    wss.clients.forEach(client => {
        if (admins.includes(client.id))
        {
            client.send(JSON.stringify({
                "type": "logUpdated",
                "message": {
                    "log": message
                }
            }));
        }
    });
}

// Creating connection using websocket
wss.on("connection", ws => {
    ws.id = uuidv4();
    appendToLogs(`new client connected: ${ws.id}`);
    // appendToLogs(`Clients: ${Array.from(wss.clients).map(c => c.id).join(",")}`);
    appendToLogs(`${wss.clients.size} clients connected`);
    players[ws.id] = {
        "name": "Unknown",
        "score": 0,
        "currentWord": 0,
        "currentAttempt": 0,
    };

    // sending message
    ws.on("message", data => {
        const messageType = JSON.parse(data).type;
        const message = JSON.parse(data).message;
        const currentPlayer = players[ws.id];

        switch (messageType) {
            case "onPasswordConnect":
                if (message.password !== adminPassword) {
                    return;
                }

                delete players[ws.id];
                admins.push(ws.id);

                ws.send(JSON.stringify({
                    "type": "adminConnected",
                    "message": {
                        "words": secretWords,
                        "gameTimeEnabled": gameTimeEnabled,
                        "endGameTime": endGameTime,
                        "logs": logs,
                        "scores": objectMap(players, p => {
                            return {
                                "name": p.name,
                                "score": p.score,
                            };
                        }),
                    }
                }));

                break;
            
            case "onGameSettingsUpdate":
                if (!admins.includes(ws.id)) {
                    return;
                }
                
                // Update secret words
                const updatedWords = message.words;
                let validWords = true;
                updatedWords.forEach(word => {
                    if (!five_letter_words.includes(word)) {
                        appendToLogs(`${word} is not a valid five letter word!`);
                        validWords = false;
                    }
                });

                if(!validWords) {
                    return;
                }

                appendToLogs(`Secret words updated to ${message.words.join(",")}`);
                secretWords = updatedWords;
                
                // Update game timer
                gameTimeEnabled = message.gameTimeEnabled;
                endGameTime = message.endGameTime;
                if (gameTimeEnabled) {
                    appendToLogs(`End game timer enabled with value ${endGameTime}`);
                }
                else {
                    appendToLogs('End game timer disabled');
                }
                
                // Reset game for players
                for(playerId in players) {
                    players[playerId].score = 0;
                    players[playerId].currentWord = 0;
                    players[playerId].currentAttempt = 0;
                }
                wss.clients.forEach(client => {
                    client.send(JSON.stringify({
                        "type": "gameRestarted",
                        "message": {
                            "timer": {
                                "enabled": gameTimeEnabled,
                                "time": endGameTime,
                            },
                            "scores": objectMap(players, p => {
                                return {
                                    "name": p.name,
                                    "score": p.score,
                                };
                            }),
                        }
                    }));
                });
                appendToLogs(`Game reset!`);

                break;

            case "onJoin":
                message.name = message.name.replace(/[^a-zA-Z 0-9]/g, "");
                appendToLogs(`${message.name} has joined!`);
                currentPlayer.name = message.name;

                ws.send(JSON.stringify({
                    "type": "scoreUpdate",
                    "message": {
                        "timer": {
                            "enabled": gameTimeEnabled,
                            "time": endGameTime,
                        },
                        "latestScore": {
                            "player": null,
                        },
                        "scores": objectMap(players, p => {
                            return {
                                "name": p.name,
                                "score": p.score,
                            };
                        }),
                    }
                }));
                break;
                
            case "onNameUpdate":
                message.name = message.name.replace(/[^a-zA-Z 0-9]/g, "");
                appendToLogs(`${currentPlayer.name}'s name has been updated to "${message.name}"`);
                currentPlayer.name = message.name;
                break;

            case "submitWord":
                if (currentPlayer.currentWord > secretWords.length-1)
                {
                    appendToLogs(`${currentPlayer.name} reached end of word list`);
                    return;
                }

                const currentSecret = secretWords[currentPlayer.currentWord];
                appendToLogs(`${message.word} was submitted by ${currentPlayer.name} on try ${currentPlayer.currentAttempt+1} for "${currentSecret}"`);
                
                let response = {
                    "type": "submitWordResponse",
                    "message": {}
                };
                
                if (five_letter_words.includes(message.word)) {
                    let letters = [];
                    
                    for (let i = 0; i < message.word.length; i++) {
                        const letter = message.word[i];
                        if (letter == currentSecret[i])
                        {
                            letters.push("correct");
                            continue;
                        }
                        
                        if (currentSecret.indexOf(letter) > -1) {
                            letters.push("wrong");
                            continue;
                        }
                        
                        letters.push("missing");
                    }

                    currentPlayer.currentAttempt++;
                    const success = message.word.toLowerCase() == currentSecret.toLowerCase();

                    if (success) {
                        appendToLogs(`${currentPlayer.name} scored a point!`);
                        currentPlayer.score++;
                        currentPlayer.currentWord++;
                        currentPlayer.currentAttempt = 0;

                        wss.clients.forEach(client => {
                            client.send(JSON.stringify({
                                "type": "scoreUpdate",
                                "message": {
                                    "latestScore": {
                                        // "isMe": client.id == ws.id,
                                        "player": ws.id,
                                    },
                                    "scores": objectMap(players, p => {
                                        return {
                                            "name": p.name,
                                            "score": p.score,
                                        };
                                    }),
                                }
                            }));
                        });
                    }

                    let answer = null;
                    if (currentPlayer.currentAttempt > 5) {
                        appendToLogs(`${currentPlayer.name} has hit max guesses for word ${currentPlayer.currentWord+1}`);
                        currentPlayer.currentWord++;
                        currentPlayer.currentAttempt = 0;
                        answer = currentSecret;
                    }
                    
                    response.message = {
                        "validWord": true,
                        "success": success,
                        "submission": message.word,
                        "letters": letters,
                        "answer": answer,
                        "gameOver": currentPlayer.currentWord > secretWords.length-1,
                    };
                } else {
                    response.message = {
                        "validWord": false,
                        "submission": message.word,
                    }
                }

                ws.send(JSON.stringify(response));
                break;
        
            default:
                appendToLogs(`Client has sent us: ${message}`);
                break;
        }
    });
    
    // handling what to do when clients disconnects from server
    ws.on("close", () => {
        appendToLogs(`${players[ws.id]?.name}(${ws.id}) has disconnected`);
        delete players[ws.id];
    });
    // handling client connection error
    ws.onerror = function () {
        appendToLogs("Some Error occurred");
    }
});
appendToLogs("The WebSocket server is running on port 8080");