// ==========================================
// MULTIPLAYER P2P CON VIDEOCHIAMATA (PeerJS)
// ==========================================
const videoGrid = document.getElementById("videoGrid");
let localStream = null; // Memorizzerà il flusso della tua webcam

function initializeMultiplayer() {
    peer = new Peer();

    peer.on('open', (id) => {
        myPeerIdText.innerText = `ID: ${id}`;
        console.log("ID PeerJS generato:", id);
    });

    // 1. ASCOLTA LE CHIAMATE DATI (Testo/Distrazioni)
    peer.on('connection', (conn) => {
        setupConnection(conn);
    });

    // 2. ASCOLTA LE CHIAMATE VIDEO IN ENTRATA
    peer.on('call', (call) => {
        // Rispondi alla chiamata inviando il tuo flusso video locale
        if (localStream) {
            call.answer(localStream);
            
            // Ricevi il flusso video dell'amica che ti sta chiamando
            call.on('stream', (friendStream) => {
                addFriendVideoElement(call.peer, friendStream);
            });
        } else {
            console.log("Avvia prima la tua webcam per poter rispondere alla videochiamata!");
        }
    });
}

function setupConnection(conn) {
    currentConnection = conn;
    connectionStatus.innerText = `Connessa con un'amica! 👭`;
    multiplayerLog.innerHTML = `<p style="color: #04d361">Connessione stabilita con successo!</p>`;

    conn.on('data', (data) => {
        if (data.type === 'DISTRACTED') {
            logFriendEvent(`⚠️ L'amica si è DISTRATTA!`);
            evidenziaDistrazioneAmica(conn.peer, true);
        } else if (data.type === 'FOCUSED') {
            logFriendEvent(`✅ L'amica è tornata a studiare.`);
            evidenziaDistrazioneAmica(conn.peer, false);
        }
    });
}

// Funzione per agganciare il video dell'amica alla griglia HTML
function addFriendVideoElement(friendPeerId, friendStream) {
    // Evitiamo di duplicare il riquadro se esiste già
    if (document.getElementById(`video-${friendPeerId}`)) return;

    const videoBox = document.createElement("div");
    videoBox.className = "video-box";
    videoBox.id = `video-${friendPeerId}`;

    const friendVideo = document.createElement("video");
    friendVideo.srcObject = friendStream;
    friendVideo.autoplay = true;
    friendVideo.playsInline = true;

    const label = document.createElement("div");
    label.className = "video-label";
    label.innerText = `Amica (${friendPeerId.substring(0, 5)}...)`;

    videoBox.appendChild(friendVideo);
    videoBox.appendChild(label);
    videoGrid.appendChild(videoBox);
}

// Se l'amica si distrae, possiamo colorare di rosso il suo riquadro video nella griglia!
function evidenziaDistrazioneAmica(friendPeerId, isDistracted) {
    const friendBox = document.getElementById(`video-${friendPeerId}`);
    if (friendBox) {
        if (isDistracted) {
            friendBox.style.borderColor = "#f75151";
            friendBox.style.boxShadow = "0 0 15px rgba(247, 81, 81, 0.5)";
        } else {
            friendBox.style.borderColor = "#29292e";
            friendBox.style.boxShadow = "none";
        }
    }
}

// Pulsante per connettersi a un'amica
document.getElementById("connectBtn").addEventListener("click", () => {
    const targetId = connectIdInput.value.trim();
    if (targetId && peer) {
        if (!localStream) {
            alert("Devi prima cliccare su 'Avvia Sessione Studio' per attivare la tua webcam!");
            return;
        }

        connectionStatus.innerText = "Connessione in corso...";
        
        // Fai partire la connessione dati (per inviare le distrazioni)
        const conn = peer.connect(targetId);
        setupConnection(conn);

        // Fai partire la videochiamata vera e propria
        const call = peer.call(targetId, localStream);
        call.on('stream', (friendStream) => {
            addFriendVideoElement(targetId, friendStream);
        });
    }
});

// ==========================================
// TIMERS, PUNTI E POMODORO
// ==========================================
function startStudioSystems() {
    pointsInterval = setInterval(() => {
        if (!distractionStartTime && currentPhase === "STUDIO") {
            points += 5;
            studioPointsText.innerText = `${points} XP`;
        }
    }, 10000);

    pomodoroInterval = setInterval(() => {
        if (pomodoroSeconds === 0) {
            if (pomodoroMinutes === 0) {
                switchPomodoroPhase();
                return;
            }
            pomodoroMinutes--;
            pomodoroSeconds = 59;
        } else {
            pomodoroSeconds--;
        }
        updatePomodoroUI();
    }, 1000);
}

function stopStudioSystems() {
    clearInterval(pointsInterval);
    clearInterval(pomodoroInterval);
}

function updatePomodoroUI() {
    const minStr = pomodoroMinutes < 10 ? "0" + pomodoroMinutes : pomodoroMinutes;
    const secStr = pomodoroSeconds < 10 ? "0" + pomodoroSeconds : pomodoroSeconds;
    pomodoroTimerText.innerText = `${minStr}:${secStr}`;
}

function switchPomodoroPhase() {
    if (currentPhase === "STUDIO") {
        currentPhase = "PAUSA";
        pomodoroPhaseText.innerText = "Pausa - Riposati! ☕";
        pomodoroPhaseText.style.color = "#04d361";
        pomodoroMinutes = 5;
        distractionOverlay.style.display = "none";
        if (!alarmAudio.paused) alarmAudio.pause();
    } else {
        currentPhase = "STUDIO";
        pomodoroPhaseText.innerText = "Studio";
        pomodoroPhaseText.style.color = "#8257e5";
        pomodoroMinutes = 25;
    }
    pomodoroSeconds = 0;
    updatePomodoroUI();
}

// ==========================================
// INTELLIGENZA ARTIFICIALE (MediaPipe)
// ==========================================
async function initializeFaceDetection() {
    try {
        statusText.innerText = "Connessione ai server IA...";
        
        // Peschiamo i file di supporto wasm sempre da unpkg
        const vision = await FilesetResolver.forVisionTasks(
            "https://unpkg.com/@mediapipe/tasks-vision@0.10.3/wasm"
        );
        
        faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
                delegate: "GPU"
            },
            outputFaceBlendshapes: true,
            runningMode: "VIDEO",
            numFaces: 1
        });
        
        statusText.innerText = "Sistemi pronti per il gruppo!";
        statusCard.className = "status-card status-focused";
        startButton.disabled = false;
        startButton.style.opacity = "1";
        startButton.innerText = "Avvia Sessione Studio";
    } catch (error) {
        console.error("Errore IA:", error);
        statusText.innerText = "Errore nel caricamento dei moduli. Controlla la console.";
    }
}

async function startWebcam() {
    const constraints = { video: { width: 640, height: 480 } };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    localStream = stream;     
    video.srcObject = stream;
    return new Promise((resolve) => video.onloadeddata = () => { video.play(); resolve(); });
}

function predictLoop() {
    if (!isSessionActive) return;

    let nowInMs = Date.now();
    if (lastVideoTime !== video.currentTime) {
        lastVideoTime = video.currentTime;
        
        if (faceLandmarker && currentPhase === "STUDIO") {
            const results = faceLandmarker.detectForVideo(video, nowInMs);
            
            if (results.faceLandmarks && results.faceLandmarks.length > 0) {
                const landmarks = results.faceLandmarks[0];
                const eyeLeft = landmarks[33];
                const eyeRight = landmarks[263];
                const eyeDistance = Math.abs(eyeLeft.x - eyeRight.x);

                if (eyeDistance < currentSensitivity) {
                    handleDistraction();
                } else {
                    handleFocused();
                }
            } else {
                handleDistraction(); 
            }
        }
    }
    window.requestAnimationFrame(predictLoop);
}

function handleDistraction() {
    if (!distractionStartTime) {
        distractionStartTime = Date.now();
        if (currentConnection) currentConnection.send({ type: 'DISTRACTED' });
    }

    const secondsDistracted = (Date.now() - distractionStartTime) / 1000;

    if (secondsDistracted > 3) {
        statusCard.className = "status-card status-distracted";
        statusText.innerText = "Distrazione rilevata! Torna sui libri!";
        distractionOverlay.style.display = "flex";
        if (alarmAudio.paused) alarmAudio.play().catch(e => console.log("Audio in attesa"));
    }
}

function handleFocused() {
    if (distractionStartTime && currentConnection) {
        currentConnection.send({ type: 'FOCUSED' });
    }
    distractionStartTime = null;
    statusCard.className = "status-card status-focused";
    statusText.innerText = "Concentrazione perfetta. Ottimo lavoro!";
    distractionOverlay.style.display = "none";
    if (!alarmAudio.paused) {
        alarmAudio.pause();
        alarmAudio.currentTime = 0;
    }
}

// ==========================================
// INTERAZIONI UI E SETUP FINALE
// ==========================================
sensitivitySlider.addEventListener("input", (e) => {
    currentSensitivity = parseFloat(e.target.value);
    if (currentSensitivity <= 0.16) {
        sensitivityValue.innerText = "Rigido (Fissa lo schermo)";
    } else if (currentSensitivity <= 0.26) {
        sensitivityValue.innerText = "Bilanciato";
    } else {
        sensitivityValue.innerText = "Tollerante (Lettura Libri/Ripetizione)";
    }
});

soundSelect.addEventListener("change", (e) => {
    alarmAudio.src = e.target.value;
});

document.getElementById("addTodoBtn").addEventListener("click", () => {
    const text = todoInput.value.trim();
    if (text) {
        const li = document.createElement("li");
        li.innerHTML = `<input type="checkbox"> <span>${text}</span>`;
        li.querySelector("input").addEventListener("change", (e) => {
            li.className = e.target.checked ? "completed" : "";
        });
        todoList.appendChild(li);
        todoInput.value = "";
    }
});

startButton.addEventListener("click", async () => {
    if (!faceLandmarker) return;

    if (!isSessionActive) {
        try {
            isSessionActive = true;
            startButton.innerText = "Connessione webcam...";
            await startWebcam();
            startButton.innerText = "Ferma Tutto";
            startButton.style.backgroundColor = "#f75151";
            startStudioSystems();
            predictLoop();
        } catch (err) {
            console.error("Errore webcam:", err);
            statusText.innerText = "Impossibile accedere alla webcam.";
            isSessionActive = false;
            startButton.innerText = "Avvia Sessione Studio";
        }
    } else {
        isSessionActive = false;
        startButton.innerText = "Avvia Sessione Studio";
        startButton.style.backgroundColor = "#8257e5";
        stopStudioSystems();
        if (video.srcObject) video.srcObject.getTracks().forEach(t => t.stop());
        handleFocused();
    }
});

// Inizializzazioni all'avvio
initializeFaceDetection();
initializeMultiplayer();
