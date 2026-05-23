// IMPORTANTE: Usiamo unpkg che non ha i bug di formato di jsdelivr
import { FilesetResolver, FaceLandmarker } from "https://unpkg.com/@mediapipe/tasks-vision@0.10.3/vision_bundle.js";

const video = document.getElementById("webcam");
const startButton = document.getElementById("startButton");
const statusCard = document.getElementById("statusCard");
const statusText = document.getElementById("statusText");
const alarmAudio = document.getElementById("alarmAudio");
const distractionOverlay = document.getElementById("distractionOverlay");
const studioPointsText = document.getElementById("studioPoints");
const pomodoroTimerText = document.getElementById("pomodoroTimer");
const pomodoroPhaseText = document.getElementById("pomodoroPhase");
const sensitivitySlider = document.getElementById("sensitivitySlider");
const sensitivityValue = document.getElementById("sensitivityValue");
const soundSelect = document.getElementById("soundSelect");

const todoInput = document.getElementById("todoInput");
const todoList = document.getElementById("todoList");
const myPeerIdText = document.getElementById("myPeerId");
const connectIdInput = document.getElementById("connectIdInput");
const connectionStatus = document.getElementById("connectionStatus");
const multiplayerLog = document.getElementById("multiplayerLog");

let faceLandmarker;
let lastVideoTime = -1;
let distractionStartTime = null;
let isSessionActive = false;
let points = 0;
let pointsInterval;

let pomodoroMinutes = 25;
let pomodoroSeconds = 0;
let pomodoroInterval;
let currentPhase = "STUDIO"; 

let currentSensitivity = parseFloat(sensitivitySlider.value); 
let peer;
let currentConnection = null;

// ==========================================
// MULTIPLAYER P2P (PeerJS)
// ==========================================
function initializeMultiplayer() {
    // Creiamo l'istanza PeerJS. Se non passiamo parametri usa i loro server cloud gratuiti
    peer = new Peer();

    peer.on('open', (id) => {
        myPeerIdText.innerText = `ID: ${id}`;
        console.log("ID PeerJS generato con successo:", id);
    });

    peer.on('error', (err) => {
        console.error("Errore PeerJS:", err);
    });

    peer.on('connection', (conn) => {
        setupConnection(conn);
    });
}

function setupConnection(conn) {
    currentConnection = conn;
    connectionStatus.innerText = `Connessa con un'amica! 👭`;
    multiplayerLog.innerHTML = `<p style="color: #04d361">Connessione stabilita con successo!</p>`;

    conn.on('data', (data) => {
        if (data.type === 'DISTRACTED') {
            logFriendEvent(`⚠️ L'amica si è DISTRATTA!`);
        } else if (data.type === 'FOCUSED') {
            logFriendEvent(`✅ L'amica è tornata a studiare.`);
        }
    });
}

function logFriendEvent(message) {
    const p = document.createElement("p");
    p.className = message.includes("DISTRACTED") ? "log-alert" : "";
    p.innerText = `[${new Date().toLocaleTimeString()}] ${message}`;
    multiplayerLog.prepend(p);
}

document.getElementById("connectBtn").addEventListener("click", () => {
    const targetId = connectIdInput.value.trim();
    if (targetId && peer) {
        connectionStatus.innerText = "Connessione in corso...";
        const conn = peer.connect(targetId);
        setupConnection(conn);
    }
});

document.getElementById("copyIdBtn").addEventListener("click", () => {
    const idText = myPeerIdText.innerText.replace("ID: ", "");
    if(!idText.includes("Caricamento")) {
        navigator.clipboard.writeText(idText);
        alert("ID Copiato!");
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
