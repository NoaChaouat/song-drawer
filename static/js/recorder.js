let mediaRecorder = null;
let audioChunks = [];
let audioBlob = null;

function getSupportedMimeType() {
    if (!window.MediaRecorder) return '';
    const types = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus',
        'audio/ogg',
    ];
    for (const type of types) {
        if (MediaRecorder.isTypeSupported(type)) return type;
    }
    return '';
}

function mimeToExt(mime) {
    if (mime.includes('mp4')) return 'mp4';
    if (mime.includes('ogg')) return 'ogg';
    return 'webm';
}

async function startRecording() {
    if (!window.MediaRecorder) {
        alert('הדפדפן שלך אינו תומך בהקלטה. נסי ב-Chrome או עדכני את Safari.');
        return;
    }
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioChunks = [];
        const mimeType = getSupportedMimeType();
        mediaRecorder = mimeType
            ? new MediaRecorder(stream, { mimeType })
            : new MediaRecorder(stream);

        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) audioChunks.push(e.data);
        };

        mediaRecorder.onstop = () => {
            const type = mediaRecorder.mimeType || mimeType || 'audio/webm';
            audioBlob = new Blob(audioChunks, { type });
            const url = URL.createObjectURL(audioBlob);
            const preview = document.getElementById('preview-player');
            preview.src = url;
            document.getElementById('preview-section').style.display = 'block';
            document.getElementById('recording-status').textContent = '';
            stream.getTracks().forEach(t => t.stop());
        };

        mediaRecorder.start();
        document.getElementById('record-btn').style.display = 'none';
        document.getElementById('stop-btn').style.display = 'inline-flex';
        document.getElementById('preview-section').style.display = 'none';
        const ss = document.getElementById('save-status');
        if (ss) ss.textContent = '';

        let secs = 0;
        const status = document.getElementById('recording-status');
        status.textContent = '● Recording...';
        window._recInterval = setInterval(() => {
            secs++;
            const m = String(Math.floor(secs / 60)).padStart(2, '0');
            const s = String(secs % 60).padStart(2, '0');
            status.textContent = `● Recording... ${m}:${s}`;
        }, 1000);

    } catch (err) {
        alert('Could not access the microphone. Please allow microphone permission in your browser.');
    }
}

function stopRecording() {
    if (!mediaRecorder) return;
    clearInterval(window._recInterval);
    mediaRecorder.stop();
    document.getElementById('stop-btn').style.display = 'none';
    document.getElementById('record-btn').style.display = 'inline-flex';
}

async function saveRecording() {
    if (!audioBlob) return;
    const status = document.getElementById('save-status');
    status.textContent = 'Saving...';
    status.className = 'save-status';

    const ext = mimeToExt(audioBlob.type);
    const formData = new FormData();
    formData.append('audio', audioBlob, `recording.${ext}`);

    try {
        const res = await fetch(`/songs/${SONG_ID}/recording`, {
            method: 'POST',
            body: formData
        });
        if (res.ok) {
            status.textContent = '✓ Recording saved!';
            status.className = 'save-status success';
            setTimeout(() => location.reload(), 800);
        } else {
            throw new Error();
        }
    } catch {
        status.textContent = 'Error saving. Please try again.';
        status.className = 'save-status error';
    }
}

function discardRecording() {
    audioBlob = null;
    audioChunks = [];
    document.getElementById('preview-section').style.display = 'none';
    const ss = document.getElementById('save-status');
    if (ss) ss.textContent = '';
    document.getElementById('preview-player').src = '';
}
