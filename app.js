// Importiamo i moduli direttamente dalla CDN ufficiale con l'estensione mjs
import { FilesetResolver, FaceLandmarker } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/vision_bundle.mjs";

const video = document.getElementById("webcam");
const startButton = document.getElementById("startButton");
const statusCard = document.getElementById("statusCard");
const statusText = document.getElementById("statusText");
const alarmAudio = document.getElementById("alarmAudio");

let faceLandmarker;
let lastVideoTime = -1;
let distractionStartTime = null;
let isSessionActive = false;

// Prepariamo visivamente il bottone
startButton.disabled = true;
startButton.innerText = "Caricamento IA di Google...";
startButton.style.opacity = "0.5";

async function initializeFaceDetection() {
    try {
        statusText.innerText = "Connessione ai server IA...";
        
        // Risolve i file WebAssembly necessari per far girare l'algoritmo nel browser
        const vision = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        );
        
        // Creiamo il rilevatore facciale
        faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
                delegate: "GPU"
            },
            outputFaceBlendshapes: true,
            runningMode: "VIDEO",
            numFaces: 1
        });
        
        statusText.innerText = "Pronta per lo studio! Clicca sotto per iniziare.";
        startButton.disabled = false;
        startButton.innerText = "Avvia Sessione Studio";
        startButton.style.opacity = "1";
        console.log("MediaPipe sbloccato e pronto!");
    } catch (error) {
        console.error("Errore di inizializzazione:", error);
        statusText.innerText = "Errore nel caricamento dei moduli. Ricarica la pagina.";
        startButton.innerText = "Errore Connessione IA";
    }
}

async function startWebcam() {
    const constraints = { video: { width: 640, height: 480 } };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = stream;
    return new Promise((resolve) => {
        video.onloadeddata = () => {
            video.play();
            resolve();
        };
    });
}

function predictLoop() {
    if (!isSessionActive) return;

    let nowInMs = Date.now();
    if (lastVideoTime !== video.currentTime) {
        lastVideoTime = video.currentTime;
        
        if (faceLandmarker) {
            const results = faceLandmarker.detectForVideo(video, nowInMs);
            
            // CONTROLLO DISTRAZIONE:
            // Se l'IA rileva i punti del viso
            if (results.faceLandmarks && results.faceLandmarks.length > 0) {
                const landmarks = results.faceLandmarks[0];
                
                // Prendiamo due punti geometrici del viso per capire se la testa è girata:
                // Punto 33 (angolo esterno occhio sinistro) e Punto 263 (angolo esterno occhio destro)
                // Se la testa si gira molto di lato, la distanza apparente tra gli occhi davanti alla webcam si riduce
                const eyeLeft = landmarks[33];
                const eyeRight = landmarks[263];
                const eyeDistance = Math.abs(eyeLeft.x - eyeRight.x);

                // Se la distanza degli occhi scende sotto una certa soglia, significa che la testa è girata di profilo
                // Oppure se l'utente guarda totalmente in basso/alto
                if (eyeDistance < 0.18) {
                    handleDistraction();
                } else {
                    handleFocused();
                }
            } else {
                // Se non vede proprio la faccia (es. ti sei alzata o hai coperto la webcam col telefono)
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

    // Se ti distrai per più di 3 secondi parte il rimprovero
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

startButton.addEventListener("click", async () => {
    if (!faceLandmarker) return;

    if (!isSessionActive) {
        try {
            isSessionActive = true;
            startButton.innerText = "Connessione webcam...";
            await startWebcam();
            startButton.innerText = "Ferma Sessione";
            startButton.style.backgroundColor = "#f75151";
            predictLoop();
        } catch (err) {
            console.error("Errore webcam:", err);
            statusText.innerText = "Impossibile accedere alla webcam. Controlla i permessi.";
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

// Avvia il caricamento dei moduli di Google
initializeFaceDetection();
