# 📚 Study Room - Stay Focused! (`study-or-die-tryin`)
Per le mie amos per sentirsi sempre in chiamata studio, e per non distrarsi ❤️

> Una webapp interattiva e intelligente progettata per simulare una stanza di studio virtuale (Body Doubling) che contrasta attivamente la distrazione in tempo reale grazie all'uso della Computer Vision locale e connessioni Peer-to-Peer.

---

## 🚀 Panoramica del Progetto

L'applicazione nasce per aiutare i gruppi di studio a mantenere alta la concentrazione. Spesso, durante lo studio sui libri cartacei o la ripetizione ad alta voce, la tentazione di controllare lo smartphone è forte. 

Questo sistema monitora la postura e l'orientamento dello sguardo dell'utente tramite la webcam: se rileva una distrazione prolungata (oltre i 3 secondi), fa scattare un richiamo acustico personalizzato. Integrando protocolli di rete decentralizzati, l'app notifica immediatamente la distrazione anche alle amiche connesse nella stessa stanza virtuale, attivando una griglia video condivisa stile videochiamata e trasformando lo studio in un'esperienza collaborativa e monitorata.

---

## 🛠️ Tech Stack

L'architettura è interamente **Serverless** e **Client-Side**, garantendo scalabilità gratuita e massima riservatezza (i flussi video non transitano su server centrali).

![HTML5](https://img.shields.io/badge/html5-%23E34F26.svg?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/css3-%231572B6.svg?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E)
![Google Cloud](https://img.shields.io/badge/Google%20MediaPipe-%234285F4.svg?style=for-the-badge&logo=google-cloud&logoColor=white)
![WebRTC](https://img.shields.io/badge/PeerJS%20(WebRTC)-%23339933.svg?style=for-the-badge&logo=webrtc&logoColor=white)
![GitHub Pages](https://img.shields.io/badge/github%20pages-%232671E5.svg?style=for-the-badge&logo=githubactions&logoColor=white)

---

## ✨ Funzionalità Avanzate

### 🤖 1. Real-time Face Tracking (MediaPipe)
Sfrutta il modello avanzato **Google MediaPipe Face Landmarker** eseguito in locale tramite WebAssembly e accelerazione hardware (`GPU delegate`). 
* Monitora la distanza euclidea tra i punti geometrici degli occhi in tempo reale.
* Calcola la rotazione del volto per intercettare quando l'utente si gira di profilo verso lo smartphone o si allontana dalla postazione.

### 🎚️ 2. Slider di Sensibilità per Ripetizione/Lettura
L'algoritmo non è rigido: include un cursore di calibrazione dinamica per impostare la tolleranza angolare dello sguardo. È ottimizzato specificamente per chi studia su manuali cartacei o ripete muovendosi, azzerando i falsi positivi.

### 👭 3. Videochiamata Multiplayer Peer-to-Peer (PeerJS)
Senza l'ausilio di database o server di segnalazione proprietari, i browser delle studentesse si connettono direttamente in modalità P2P (WebRTC) tramite ID temporanei. 
* Visualizzazione simultanea delle webcam sincronizzate in una griglia fluida.
* Scambio di pacchetti dati in background: se un'amica si distrae, il suo riquadro video si colora di rosso sul monitor di tutte le altre connesse.

### ⏱️ 4. Gamification, Pomodoro & To-Do List
* **Punti Studio (XP):** Un counter incrementale premia la concentrazione continuata assegnando punti esperienza ogni 10 secondi di focus.
* **Timer Pomodoro:** Gestione ciclica integrata (25 minuti studio / 5 minuti pausa) che disattiva temporaneamente i vincoli della webcam durante il break.
* **Gestore Obiettivi:** Una To-Do list laterale reattiva per pianificare e spuntare i micro-task della sessione.

---

## 💻 Come testarlo in locale

L'applicazione richiede l'esecuzione all'interno di un contesto sicuro (Secure Context) per l'attivazione delle API della fotocamera. Per provarla in locale:

1. Clona la repository:
```bash
   git clone [https://github.com/mariannavantaggiato/study-or-die-tryin.git](https://github.com/mariannavantaggiato/study-or-die-tryin.git)
```

2. Spostati nella directory ed esponi i file tramite un server HTTP locale (es. Python):
```bash
   cd study-or-die-tryin
   python3 -m http.server 8000```
```

3. Apri il browser all'indirizzo http://localhost:8000.

## 🌐 Deploy in Produzione
Il progetto è pubblicato e accessibile tramite GitHub Pages al seguente indirizzo:
🔗 `https://mariannavantaggiato.github.io/study-or-die-tryin/`

Nota: Per il corretto funzionamento delle funzionalità multiplayer e dell'accesso hardware alla webcam, l'applicazione impone l'instradamento esclusivo su protocollo cifrato HTTPS.
