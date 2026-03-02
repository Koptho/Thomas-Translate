const state = {
  stream: null,
};

const ui = {
  startCameraBtn: document.getElementById("startCameraBtn"),
  captureBtn: document.getElementById("captureBtn"),
  fileInput: document.getElementById("fileInput"),
  cameraFeed: document.getElementById("cameraFeed"),
  snapshotCanvas: document.getElementById("snapshotCanvas"),
  previewImage: document.getElementById("previewImage"),
  statusBox: document.getElementById("statusBox"),
  norwegianText: document.getElementById("norwegianText"),
  ukrainianText: document.getElementById("ukrainianText"),
  autoSpeak: document.getElementById("autoSpeak"),
  speakBtn: document.getElementById("speakBtn"),
  stopBtn: document.getElementById("stopBtn"),
};

const translationEndpoints = [
  "https://translate.argosopentech.com/translate",
  "https://libretranslate.de/translate",
];

ui.startCameraBtn.addEventListener("click", startCamera);
ui.captureBtn.addEventListener("click", captureFrame);
ui.fileInput.addEventListener("change", onFilePicked);
ui.speakBtn.addEventListener("click", () => speakUkrainian(ui.ukrainianText.value));
ui.stopBtn.addEventListener("click", stopSpeaking);

window.addEventListener("beforeunload", stopCamera);

async function startCamera() {
  try {
    stopSpeaking();
    stopCamera();
    setStatus("Opnar kamera...");

    state.stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
      audio: false,
    });

    ui.cameraFeed.srcObject = state.stream;
    await ui.cameraFeed.play();
    ui.captureBtn.disabled = false;
    setStatus("Kamera klart. Trykk 'Ta bilde'.");
  } catch (error) {
    setStatus("Fekk ikkje tilgang til kamera. Bruk 'Last opp bilde' eller sjekk Safari-tilgang.", true);
  }
}

function stopCamera() {
  if (!state.stream) {
    return;
  }

  for (const track of state.stream.getTracks()) {
    track.stop();
  }

  state.stream = null;
  ui.cameraFeed.srcObject = null;
  ui.captureBtn.disabled = true;
}

async function captureFrame() {
  if (!state.stream) {
    setStatus("Start kamera først.", true);
    return;
  }

  const video = ui.cameraFeed;
  const canvas = ui.snapshotCanvas;
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.95));
  if (!blob) {
    setStatus("Klarte ikkje å ta bilde.", true);
    return;
  }

  await processImageBlob(blob);
}

async function onFilePicked(event) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  stopSpeaking();
  await processImageBlob(file);
  ui.fileInput.value = "";
}

async function processImageBlob(blob) {
  try {
    const previewUrl = URL.createObjectURL(blob);
    ui.previewImage.src = previewUrl;
    ui.previewImage.style.display = "block";

    setStatus("Les norsk tekst frå bilde...");
    ui.norwegianText.value = "";
    ui.ukrainianText.value = "";
    ui.speakBtn.disabled = true;

    const norwegian = await extractNorwegianText(blob);
    ui.norwegianText.value = norwegian;

    setStatus("Omset til ukrainsk...");
    const ukrainian = await translateToUkrainian(norwegian);
    ui.ukrainianText.value = ukrainian;
    ui.speakBtn.disabled = ukrainian.trim().length === 0;

    setStatus("Ferdig.");

    if (ui.autoSpeak.checked && ukrainian.trim().length > 0) {
      speakUkrainian(ukrainian);
    }
  } catch (error) {
    console.error(error);
    setStatus(error?.message || "Noko gjekk gale under behandlinga.", true);
  }
}

async function extractNorwegianText(imageBlob) {
  if (!window.Tesseract) {
    throw new Error("OCR-bibliotek lasta ikkje inn. Last sida på nytt.");
  }

  const result = await window.Tesseract.recognize(imageBlob, "nor", {
    logger: (msg) => {
      if (msg.status === "recognizing text") {
        const percent = Math.round((msg.progress || 0) * 100);
        setStatus(`Les tekst... ${percent}%`);
      }
    },
  });

  const text = (result?.data?.text || "").trim();
  if (!text) {
    throw new Error("Fann ingen tekst i bildet. Prøv betre lys og skarpare fokus.");
  }

  return text;
}

async function translateToUkrainian(text) {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("Ingen tekst å omsetje.");
  }

  const payload = {
    q: trimmed,
    source: "no",
    target: "uk",
    format: "text",
  };

  let lastError = null;

  for (const endpoint of translationEndpoints) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const translatedText = (data?.translatedText || "").trim();

      if (!translatedText) {
        throw new Error("Tomt svar frå omsetjingstenesta.");
      }

      return translatedText;
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(`Klarte ikkje å omsetje tekst no. Prøv igjen seinare. ${lastError ? `(${lastError.message})` : ""}`);
}

function speakUkrainian(text) {
  const trimmed = text.trim();
  if (!trimmed) {
    setStatus("Ingen ukrainsk tekst å lese opp.", true);
    return;
  }

  if (!("speechSynthesis" in window)) {
    setStatus("Opplesing er ikkje støtta i denne nettlesaren.", true);
    return;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(trimmed);
  utterance.lang = "uk-UA";
  utterance.rate = 0.95;

  const voices = window.speechSynthesis.getVoices();
  const ukrainianVoice = voices.find((voice) => voice.lang.toLowerCase().startsWith("uk"));
  if (ukrainianVoice) {
    utterance.voice = ukrainianVoice;
  }

  window.speechSynthesis.speak(utterance);
}

function stopSpeaking() {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

function setStatus(message, isError = false) {
  ui.statusBox.textContent = message;
  ui.statusBox.classList.toggle("error", Boolean(isError));
}
