import { FilesetResolver, FaceLandmarker } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/vision_bundle.js";

const video = document.getElementById("webcam");
const startButton = document.getElementById("startButton");
const statusCard = document.getElementById("statusCard");
const statusText = document.getElementById("statusText");
const alarmAudio = document.getElementById("alarmAudio");

let faceLandmarker;
let runningMode = "VIDEO";
let lastVideoTime = -1;
let distractionStartTime = null;
let isSessionActive = false;

// 1. Inizializza l'Intelligenza Artificiale di Google MediaPipe
async function initializeFaceDetection() {
    statusText.innerText = "Caricamento Modello IA...";
    const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
    );
    
    faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
            delegate: "GPU"
        },
        outputFaceBlendshapes: true,
        runningMode: runningMode,
        numFaces: 1
    });
    
    statusText.innerText = "Pronta per lo studio! Clicca sotto per iniziare.";
    startButton.disabled = false;
}

// 2. Attiva la Webcam
async function startWebcam() {
    const constraints = { video: { width: 640, height: 480 } };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = stream;
    video.addEventListener("loadeddata", predictLoop);
}

// 3. Il ciclo continuo di analisi (gira ad ogni fotogramma)
async function predictLoop() {
    if (!isSessionActive) return;

    let nowInMs = Date.now();
    if (lastVideoTime !== video.currentTime) {
        lastVideoTime = video.currentTime;
        
        const results = faceLandmarker.detectForVideo(video, nowInMs);
        
        if (results.facialTransformationMatrixes && results.facialTransformationMatrixes.length > 0) {
            // Estraiamo la matrice di rotazione per capire dove guarda la testa
            const matrix = results.facialTransformationMatrixes[0];
            
            // Il valore all'indice 2 della matrice ci dice quanto la testa è ruotata a destra o sinistra
            const yaw = matrix[2]; 
            
            // Soglia di tolleranza: se il valore supera 0.25, la testa è girata di lato
            const isLookingAway = Math.abs(yaw) > 0.25;

            if (isLookingAway) {
                handleDistraction();
            } else {
                handleFocused();
            }
        } else {
            // Se non viene rilevato nessun volto (es. si è alzata dalla sedia) conta come distrazione
            handleDistraction();
        }
    }
    
    // Richiama la funzione al fotogramma successivo per continuità
    window.requestAnimationFrame(predictLoop);
}

function handleDistraction() {
    if (!distractionStartTime) {
        distractionStartTime = Date.now();
    }

    const secondsDistracted = (Date.now() - distractionStartTime) / 1000;

    // Se si distrae per più di 3 secondi consecutivi
    if (secondsDistracted > 3) {
        statusCard.className = "status-card status-distracted";
        statusText.innerText = "Mettiti composta e studia! 🚨";
        if (alarmAudio.paused) {
            alarmAudio.play().catch(e => console.log("Audio in attesa di interazione"));
        }
    }
}

function handleFocused() {
    distractionStartTime = null;
    statusCard.className = "status-card status-focused";
    statusText.innerText = "Stai andando alla grande! Continua così 💪";
    if (!alarmAudio.paused) {
        alarmAudio.pause();
        alarmAudio.currentTime = 0; // Resetta l'audio dall'inizio
    }
}

// Gestione del click sul pulsante
startButton.addEventListener("click", async () => {
    if (!isSessionActive) {
        isSessionActive = true;
        startButton.innerText = "Ferma Sessione";
        startButton.style.backgroundColor = "#f75151";
        await startWebcam();
    } else {
        isSessionActive = false;
        startButton.innerText = "Avvia Sessione Studio";
        startButton.style.backgroundColor = "#8257e5";
        // Spegne la webcam
        const tracks = video.srcObject.getTracks();
        tracks.forEach(track => track.stop());
        alarmAudio.pause();
        statusCard.className = "status-card";
        statusText.innerText = "Sessione terminata.";
    }
});

// Avvia il caricamento dell'IA all'apertura della pagina
initializeFaceDetection();
