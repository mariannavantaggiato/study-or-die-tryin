//Sostituita la vecchia riga di jsdelivr con questa di unpkg
//import { FilesetResolver, FaceLandmarker } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/vision_bundle.js";
import { FilesetResolver, FaceLandmarker } from "https://unpkg.com/@mediapipe/tasks-vision@0.10.3/vision_bundle.js";

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

// Disabilitiamo il pulsante all'avvio finché l'IA non è pronta
startButton.disabled = true;
startButton.innerText = "Caricamento IA in corso...";
startButton.style.opacity = "0.5";

// 1. Inizializza l'Intelligenza Artificiale di Google MediaPipe
async function initializeFaceDetection() {
    try {
        statusText.innerText = "Caricamento Modello IA...";
        //const vision = await FilesetResolver.forVisionTasks(
           // "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        //Sostituita la vecchia riga di jsdelivr con questa di unpkg
        const vision = await FilesetResolver.forVisionTasks(
         "https://unpkg.com/@mediapipe/tasks-vision@0.10.3/wasm"
        );    
        
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
        // Sblocchiamo il pulsante una volta che tutto è pronto
        startButton.disabled = false;
        startButton.innerText = "Avvia Sessione Studio";
        startButton.style.opacity = "1";
        console.log("MediaPipe FaceLandmarker caricato con successo!");
    } catch (error) {
        console.error("Errore nel caricamento di MediaPipe:", error);
        statusText.innerText = "Errore nel caricamento dell'IA. Controlla la console.";
        startButton.innerText = "Errore di caricamento";
    }
}

// 2. Attiva la Webcam
async function startWebcam() {
    const constraints = { video: { width: 640, height: 480 } };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = stream;
    
    // Usiamo una promessa per assicurarci che il video sia pronto prima di avviare il loop
    return new Promise((resolve) => {
        video.onloadeddata = () => {
            video.play();
            resolve();
        };
    });
}

// 3. Il ciclo continuo di analisi
async function predictLoop() {
    if (!isSessionActive) return;

    let nowInMs = Date.now();
    if (lastVideoTime !== video.currentTime) {
        lastVideoTime = video.currentTime;
        
        if (faceLandmarker) {
            const results = faceLandmarker.detectForVideo(video, nowInMs);
            
            if (results.facialTransformationMatrixes && results.facialTransformationMatrixes.length > 0) {
                const matrix = results.facialTransformationMatrixes[0];
                const yaw = matrix[2]; // Rotazione destra/sinistra
                
                const isLookingAway = Math.abs(yaw) > 0.25;

                if (isLookingAway) {
                    handleDistraction();
                } else {
                    handleFocused();
                }
            } else {
                // Nessun volto rilevato (es. si è alzata)
                handleDistraction();
            }
        }
    }
    
    window.requestAnimationFrame(predictLoop);
}

function handleDistraction() {
    if (!distractionStartTime) {
        distractionStartTime = Date.now();
    }

    const secondsDistracted = (Date.now() - distractionStartTime) / 1000;

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
        alarmAudio.currentTime = 0;
    }
}

// Gestione del click sul pulsante
startButton.addEventListener("click", async () => {
    // Se l'IA non è ancora caricata, blocca il click per sicurezza
    if (!faceLandmarker) {
        console.log("L'IA si sta ancora caricando, attendi...");
        return;
    }

    if (!isSessionActive) {
        try {
            isSessionActive = true;
            startButton.innerText = "Inizializzazione fotocamera...";
            await startWebcam();
            startButton.innerText = "Ferma Sessione";
            startButton.style.backgroundColor = "#f75151";
            // Avvia il ciclo di predizione
            predictLoop();
        } catch (err) {
            console.error("Errore nell'accesso alla webcam:", err);
            statusText.innerText = "Impossibile accedere alla webcam. Controlla i permessi del browser.";
            isSessionActive = false;
            startButton.innerText = "Avvia Sessione Studio";
        }
    } else {
        isSessionActive = false;
        startButton.innerText = "Avvia Sessione Studio";
        startButton.style.backgroundColor = "#8257e5";
        
        if (video.srcObject) {
            const tracks = video.srcObject.getTracks();
            tracks.forEach(track => track.stop());
        }
        alarmAudio.pause();
        statusCard.className = "status-card";
        statusText.innerText = "Sessione terminata.";
    }
});

// Avvia il caricamento dell'IA all'apertura della pagina
initializeFaceDetection();
