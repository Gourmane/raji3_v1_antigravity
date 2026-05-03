const WAV_CHUNK_FRAMES = 8192;
const MP3_BLOCK_FRAMES = 1152;
const MAX_EXPORT_BYTES = 350 * 1024 * 1024;

const cancelledJobs = new Set();
let lameLoaded = false;

self.addEventListener('message', (event) => {
    const data = event.data || {};

    if (data.type === 'cancel') {
        cancelledJobs.add(data.jobId);
        return;
    }

    if (data.type !== 'export') return;

    handleExport(data).catch((error) => {
        self.postMessage({
            type: 'error',
            jobId: data.jobId,
            message: error && error.message ? error.message : 'Export impossible.'
        });
    }).finally(() => {
        cancelledJobs.delete(data.jobId);
    });
});

async function handleExport(data) {
    const { jobId, format, channels, sampleRate, startSample, endSample } = data;
    const length = Math.max(0, endSample - startSample);

    if (!length || !channels || !channels.length) {
        throw new Error('Loop invalide.');
    }

    ensureNotCancelled(jobId);
    postProgress(jobId, 42, 'Preparation export...');

    const blob = format === 'mp3'
        ? await encodeMP3({ jobId, channels, sampleRate, startSample, length })
        : await encodeWAV({ jobId, channels, sampleRate, startSample, length });

    ensureNotCancelled(jobId);
    self.postMessage({
        type: 'complete',
        jobId,
        blob,
        extension: format,
        duration: length / sampleRate
    });
}

async function encodeWAV({ jobId, channels, sampleRate, startSample, length }) {
    const numChannels = channels.length;
    const bytesPerSample = 2;
    const blockAlign = numChannels * bytesPerSample;
    const dataLength = length * blockAlign;
    const bufferLength = 44 + dataLength;

    if (bufferLength > MAX_EXPORT_BYTES) {
        throw new Error('Loop trop longue pour cet appareil. Essaie une selection plus courte.');
    }

    const arrayBuffer = new ArrayBuffer(bufferLength);
    const view = new DataView(arrayBuffer);

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
    view.setUint32(40, dataLength, true);

    let offset = 44;
    for (let frame = 0; frame < length; frame += WAV_CHUNK_FRAMES) {
        ensureNotCancelled(jobId);
        const chunkEnd = Math.min(length, frame + WAV_CHUNK_FRAMES);

        for (let i = frame; i < chunkEnd; i++) {
            const sourceIndex = startSample + i;
            for (let channel = 0; channel < numChannels; channel++) {
                const sample = clampSample(channels[channel][sourceIndex]);
                view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
                offset += 2;
            }
        }

        postProgress(jobId, 42 + Math.round((chunkEnd / length) * 56), 'Encodage WAV...');
        await yieldControl();
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
}

async function encodeMP3({ jobId, channels, sampleRate, startSample, length }) {
    await loadLame();
    ensureNotCancelled(jobId);

    const mp3Channels = Math.min(2, channels.length);
    const mp3encoder = new lamejs.Mp3Encoder(mp3Channels, sampleRate, 128);
    const mp3Data = [];

    for (let frame = 0; frame < length; frame += MP3_BLOCK_FRAMES) {
        ensureNotCancelled(jobId);
        const chunkEnd = Math.min(length, frame + MP3_BLOCK_FRAMES);
        const chunkLength = chunkEnd - frame;
        const left = new Int16Array(chunkLength);
        const right = mp3Channels > 1 ? new Int16Array(chunkLength) : undefined;

        for (let i = 0; i < chunkLength; i++) {
            const sourceIndex = startSample + frame + i;
            const leftSample = clampSample(channels[0][sourceIndex]);
            left[i] = leftSample < 0 ? leftSample * 0x8000 : leftSample * 0x7FFF;

            if (right) {
                const rightSample = clampSample(channels[1][sourceIndex]);
                right[i] = rightSample < 0 ? rightSample * 0x8000 : rightSample * 0x7FFF;
            }
        }

        const encoded = mp3encoder.encodeBuffer(left, right);
        if (encoded.length > 0) mp3Data.push(encoded);

        if (frame % (MP3_BLOCK_FRAMES * 24) === 0) {
            postProgress(jobId, 42 + Math.round((chunkEnd / length) * 56), 'Encodage MP3...');
            await yieldControl();
        }
    }

    ensureNotCancelled(jobId);
    const finalBuffer = mp3encoder.flush();
    if (finalBuffer.length > 0) mp3Data.push(finalBuffer);

    postProgress(jobId, 98, 'Finalisation...');
    return new Blob(mp3Data, { type: 'audio/mp3' });
}

async function loadLame() {
    if (lameLoaded) return;
    importScripts('./vendor/lame.min.js');
    if (typeof lamejs === 'undefined') {
        throw new Error('Bibliotheque MP3 indisponible.');
    }
    lameLoaded = true;
}

function postProgress(jobId, progress, label) {
    self.postMessage({
        type: 'progress',
        jobId,
        progress: Math.max(0, Math.min(100, progress)),
        label
    });
}

function ensureNotCancelled(jobId) {
    if (cancelledJobs.has(jobId)) {
        throw new Error('Export annule.');
    }
}

function yieldControl() {
    return new Promise((resolve) => setTimeout(resolve, 0));
}

function clampSample(sample) {
    return Math.max(-1, Math.min(1, Number(sample) || 0));
}

function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}
