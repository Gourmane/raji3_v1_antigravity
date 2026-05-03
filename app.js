/**
 * rajiaa – Audio Loop & Fusion App
 * Full Application Logic v2.0
 * - Improved localStorage with IndexedDB fallback
 * - Download functionality
 * - Fusion name editing
 */

// ============================================
// Constants & State
// ============================================
const STORAGE_KEY = 'audioLooper_saved';
const DB_NAME = 'rajiaaAudioDB';
const DB_VERSION = 2;
const STORE_NAME = 'audios';
const METADATA_STORE_NAME = 'audioMetadata';
const BLOB_STORE_NAME = 'audioBlobs';
const MIN_LOOP_DURATION = 0.3;
const MAX_AUDIO_FILE_SIZE = 150 * 1024 * 1024;
const LONG_AUDIO_DURATION = 15 * 60;
const DETAILED_WAVEFORM_MAX_DURATION = 15 * 60;
const WAVEFORM_PEAK_COUNT = 240;
const MAX_LOOP_EXPORT_DURATION = 20 * 60;
const EXPORT_PROGRESS_DECODE = 36;
const SUPPORTED_AUDIO_EXTENSIONS = ['mp3', 'wav', 'm4a', 'ogg'];
const SUPPORTED_AUDIO_TYPES = [
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/x-wav',
    'audio/mp4',
    'audio/aac',
    'audio/ogg'
];

const MESSAGES = {
    UNSUPPORTED_FORMAT: 'Ce fichier audio n’est pas supporté. Essaie MP3, WAV, M4A ou OGG.',
    FILE_TOO_LARGE: 'Ce fichier est trop lourd pour ton appareil. Essaie un fichier plus léger ou coupe une partie.',
    LONG_AUDIO: 'Audio long détecté. La lecture est possible, mais l’export peut prendre plus de temps.',
    INVALID_LOOP: 'La fin de la boucle doit être après le début.',
    LOOP_TOO_SHORT: 'La boucle doit durer au moins 0.3 seconde.',
    STORAGE_FULL: 'L’espace de stockage du navigateur est plein. Supprime quelques audios.',
    EXPORT_IN_PROGRESS: 'Export de la boucle… ne ferme pas l’application.',
    EXPORT_SUCCESS: 'Loop exportée avec succès.',
    EXPORT_TOO_LONG: 'Cette loop est trop longue pour un export stable. Essaie une selection plus courte.',
    EXPORT_CANCELLED: 'Export annule.'
};

let db = null;
let useIndexedDB = false;

const state = {
    currentAudio: null,
    currentAudioBlob: null,
    currentAudioObjectUrl: null,
    currentAudioName: null,
    loopEnabled: false,
    loopStart: 0,
    loopEnd: 0,
    library: [],
    renameTarget: null,
    fusionAudioA: null,
    fusionAudioB: null,
    fusionResult: null,
    fusionBlob: null,
    fusionBuffer: null,
    fusionObjectUrl: null,
    extractedBlob: null,
    extractedFormat: null,
    currentAudioExtension: 'wav',
    lastFocusedElement: null,
    waveformPeaks: [],
    waveformMode: 'empty',
    waveformToken: 0,
    waveDrag: null,
    pendingLoop: null,
    loopSelectionLocked: false,
    exportWorker: null,
    exportJobId: null,
    exportCancelled: false,
    librarySearch: '',
    librarySort: 'newest'
};

// ============================================
// DOM Elements
// ============================================
let els = {};

function initDOMElements() {
    els = {
        headerTitle: document.getElementById('header-title'),
        headerSubtitle: document.getElementById('header-subtitle'),
        screenLoop: document.getElementById('screen-loop'),
        screenFusion: document.getElementById('screen-fusion'),
        screenSettings: document.getElementById('screen-settings'),
        navBtns: document.querySelectorAll('.nav-btn'),
        audioInput: document.getElementById('audio-input'),
        fileName: document.getElementById('file-name'),
        playerContainer: document.getElementById('player-container'),
        audioPlayer: document.getElementById('audio-player'),
        audioDuration: document.getElementById('audio-duration'),
        waveformPanel: document.getElementById('waveform-panel'),
        waveformCurrent: document.getElementById('waveform-current'),
        waveformLoopLabel: document.getElementById('waveform-loop-label'),
        waveformTrack: document.getElementById('waveform-track'),
        waveformCanvas: document.getElementById('waveform-canvas'),
        waveformSelection: document.getElementById('waveform-selection'),
        waveformPlayhead: document.getElementById('waveform-playhead'),
        waveformStatus: document.getElementById('waveform-status'),
        loopStart: document.getElementById('loop-start'),
        loopEnd: document.getElementById('loop-end'),
        loopValidation: document.getElementById('loop-validation'),
        btnToggleLoop: document.getElementById('btn-toggle-loop'),
        btnGoLoopStart: document.getElementById('btn-go-loop-start'),
        btnClearLoop: document.getElementById('btn-clear-loop'),
        btnLockLoop: document.getElementById('btn-lock-loop'),
        btnSaveAudio: document.getElementById('btn-save-audio'),
        extractCard: document.getElementById('extract-card'),
        extractName: document.getElementById('extract-name'),
        btnExtractLoop: document.getElementById('btn-extract-loop'),
        btnSaveExtract: document.getElementById('btn-save-extract'),
        exportProgress: document.getElementById('export-progress'),
        exportProgressLabel: document.getElementById('export-progress-label'),
        exportProgressValue: document.getElementById('export-progress-value'),
        exportProgressBar: document.getElementById('export-progress-bar'),
        btnCancelExport: document.getElementById('btn-cancel-export'),
        librarySearch: document.getElementById('library-search'),
        librarySort: document.getElementById('library-sort'),
        libraryCount: document.getElementById('library-count'),
        libraryList: document.getElementById('library-list'),
        fusionSelectA: document.getElementById('fusion-select-a'),
        fusionSelectB: document.getElementById('fusion-select-b'),
        btnRemoveA: document.getElementById('btn-remove-a'),
        btnRemoveB: document.getElementById('btn-remove-b'),
        btnFusion: document.getElementById('btn-fusion'),
        fusionResultCard: document.getElementById('fusion-result-card'),
        fusionPlayer: document.getElementById('fusion-player'),
        fusionNameInput: document.getElementById('fusion-name-input'),
        btnDownloadFusion: document.getElementById('btn-download-fusion'),
        btnSaveFusion: document.getElementById('btn-save-fusion'),
        renameModal: document.getElementById('rename-modal'),
        renameInput: document.getElementById('rename-input'),
        btnCancelRename: document.getElementById('btn-cancel-rename'),
        btnConfirmRename: document.getElementById('btn-confirm-rename'),
        toastRegion: document.getElementById('toast-region')
    };
}

// ============================================
// Utility Functions
// ============================================
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function formatTime(seconds) {
    if (isNaN(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function formatFileSize(bytes) {
    const value = Number(bytes) || 0;
    if (value < 1024) return `${value} o`;
    if (value < 1024 * 1024) return `${Math.round(value / 1024)} Ko`;
    return `${(value / (1024 * 1024)).toFixed(value >= 10 * 1024 * 1024 ? 0 : 1)} Mo`;
}

function formatDateShort(dateValue) {
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return 'Date inconnue';
    return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

function parseTime(timeStr) {
    if (!timeStr) return 0;
    const parts = timeStr.split(':');
    if (parts.length !== 2) return 0;
    const mins = parseInt(parts[0], 10) || 0;
    const secs = parseInt(parts[1], 10) || 0;
    return mins * 60 + secs;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function escapeAttribute(text) {
    return escapeHtml(String(text || '')).replace(/"/g, '&quot;');
}

function sanitizeFileName(name) {
    const cleaned = String(name || 'audio')
        .replace(/[\\/:*?"<>|]/g, '-')
        .replace(/\s+/g, ' ')
        .trim();
    return cleaned.slice(0, 90) || 'audio';
}

function getFileExtension(fileName) {
    const match = String(fileName || '').toLowerCase().match(/\.([a-z0-9]+)$/);
    return match ? match[1] : '';
}

function getAudioExtensionFromDataURL(dataURL, fallback = 'wav') {
    const match = String(dataURL || '').match(/^data:audio\/([^;,]+)/);
    if (!match) return fallback;
    return getAudioExtensionFromMimeType(`audio/${match[1].toLowerCase()}`, fallback);
}

function getAudioExtensionFromMimeType(mimeType, fallback = 'wav') {
    const type = String(mimeType || '').toLowerCase();
    if (type.includes('mpeg') || type.includes('mp3')) return 'mp3';
    if (type.includes('mp4') || type.includes('aac')) return 'm4a';
    if (type.includes('ogg')) return 'ogg';
    if (type.includes('wav')) return 'wav';
    return fallback;
}

function isSupportedAudioFile(file) {
    if (!file) return false;
    const extension = getFileExtension(file.name);
    return SUPPORTED_AUDIO_TYPES.includes(file.type) || SUPPORTED_AUDIO_EXTENSIONS.includes(extension);
}

function getSelectedFormat(groupName, fallback = 'wav') {
    const selected = document.querySelector(`input[name="${groupName}"]:checked`);
    return selected ? selected.value : fallback;
}

function getAudioDuration() {
    return Number.isFinite(els.audioPlayer.duration) ? els.audioPlayer.duration : 0;
}

function readBlobAsDataURL(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error || new Error('FileReader failed'));
        reader.readAsDataURL(blob);
    });
}

function dataURLToBlob(dataURL) {
    const parts = String(dataURL || '').split(',');
    if (parts.length < 2) {
        throw new Error('Invalid DataURL');
    }

    const meta = parts[0];
    const mimeMatch = meta.match(/data:([^;]+)/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'audio/wav';
    const binary = atob(parts[1]);
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }

    return new Blob([bytes], { type: mimeType });
}

function getModernStorageAvailable() {
    return Boolean(
        db &&
        db.objectStoreNames.contains(METADATA_STORE_NAME) &&
        db.objectStoreNames.contains(BLOB_STORE_NAME)
    );
}

function revokeObjectUrl(url) {
    if (url && url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
    }
}

function setCurrentAudioSource({ url, blob = null, name, extension = 'wav' }) {
    revokeObjectUrl(state.currentAudioObjectUrl);
    state.currentAudio = url;
    state.currentAudioBlob = blob;
    state.currentAudioObjectUrl = url && url.startsWith('blob:') ? url : null;
    state.currentAudioName = name;
    state.currentAudioExtension = extension;
}

function setFusionPreview(blob, fallbackName) {
    revokeObjectUrl(state.fusionObjectUrl);
    const objectUrl = URL.createObjectURL(blob);
    state.fusionObjectUrl = objectUrl;
    els.fusionPlayer.src = objectUrl;
    if (fallbackName) {
        els.fusionNameInput.value = fallbackName;
    }
}

function stripRuntimeFields(item) {
    const { dataURL, _blob, objectUrl, ...metadata } = item;
    return metadata;
}

function normalizeAudioMetadata(item, blob) {
    const id = item.id || generateId();
    return {
        ...stripRuntimeFields(item),
        id,
        nom: sanitizeFileName(item.nom || 'Audio sans nom'),
        type: item.type === 'fusion' ? 'fusion' : 'import',
        format: item.format || getAudioExtensionFromMimeType(blob ? blob.type : '', getAudioExtensionFromDataURL(item.dataURL, 'wav')),
        blobId: item.blobId || id,
        size: item.size || (blob ? blob.size : 0),
        dateCreation: item.dateCreation || new Date().toISOString(),
        loopStart: Number(item.loopStart) || 0,
        loopEnd: Number(item.loopEnd) || 0,
        storageVersion: 2
    };
}

function setButtonText(button, text) {
    const span = button ? button.querySelector('span') : null;
    if (span) {
        span.textContent = text;
    }
}

function clearExtractedCache() {
    state.extractedBlob = null;
    state.extractedFormat = null;
}

function getUserAudioErrorMessage(error) {
    const name = error && error.name ? error.name : '';
    const message = error && error.message ? error.message : '';
    if (name === 'QuotaExceededError' || message.includes('quota') || message.includes('storage')) {
        return MESSAGES.STORAGE_FULL;
    }
    if (name === 'EncodingError' || name === 'NotSupportedError' || message.includes('decode')) {
        return MESSAGES.UNSUPPORTED_FORMAT;
    }
    if (message === MESSAGES.INVALID_LOOP || message === MESSAGES.LOOP_TOO_SHORT) {
        return message;
    }
    if (message === MESSAGES.EXPORT_TOO_LONG || message === MESSAGES.EXPORT_CANCELLED || message.includes('trop longue')) {
        return message;
    }
    if (message.includes('annule')) {
        return MESSAGES.EXPORT_CANCELLED;
    }
    return 'Une erreur est survenue. Réessaie avec un autre fichier audio.';
}

function validateLoopInputs({ showError = true, clampToDuration = true } = {}) {
    if (!state.currentAudio) {
        return { valid: false, startTime: 0, endTime: 0, reason: '' };
    }

    const duration = getAudioDuration();
    const startTime = parseTime(els.loopStart.value || '00:00');
    let endTime = els.loopEnd.value ? parseTime(els.loopEnd.value) : duration;

    if (duration && clampToDuration && endTime > duration) {
        endTime = duration;
        els.loopEnd.value = formatTime(endTime);
    }

    if (startTime < 0 || endTime <= startTime) {
        if (showError) showToast(MESSAGES.INVALID_LOOP, 'error');
        return { valid: false, startTime, endTime, reason: MESSAGES.INVALID_LOOP };
    }

    if (endTime - startTime < MIN_LOOP_DURATION) {
        if (showError) showToast(MESSAGES.LOOP_TOO_SHORT, 'error');
        return { valid: false, startTime, endTime, reason: MESSAGES.LOOP_TOO_SHORT };
    }

    return { valid: true, startTime, endTime };
}

function setLoopValidation(message = '', type = 'neutral') {
    if (!els.loopValidation) return;
    els.loopValidation.textContent = message;
    els.loopValidation.classList.toggle('error', type === 'error');
}

function setLoopInputsInvalid(isInvalid) {
    [els.loopStart, els.loopEnd].forEach((input) => {
        if (!input) return;
        const group = input.closest('.input-group');
        if (group) group.classList.toggle('invalid', isInvalid);
    });
}

function updateLoopEditLockState() {
    const isLocked = state.loopSelectionLocked && !!state.currentAudio;

    [els.loopStart, els.loopEnd].forEach((input) => {
        if (input) input.readOnly = isLocked;
    });

    if (els.waveformSelection) {
        els.waveformSelection.classList.toggle('locked', isLocked);
    }

    if (els.btnLockLoop) {
        els.btnLockLoop.classList.toggle('active', isLocked);
        els.btnLockLoop.setAttribute('aria-pressed', String(isLocked));
        setButtonText(els.btnLockLoop, isLocked ? 'Unlock' : 'Lock');
    }
}

function applyLoopInputs({ showError = false, commit = true } = {}) {
    const loop = validateLoopInputs({ showError });

    if (!state.currentAudio) {
        setLoopValidation('');
        setLoopInputsInvalid(false);
        return loop;
    }

    if (!loop.valid) {
        setLoopValidation(loop.reason, 'error');
        setLoopInputsInvalid(true);
        updateLoopButtonState();
        if (els.extractCard) els.extractCard.classList.add('hidden');
        if (els.btnExtractLoop) els.btnExtractLoop.disabled = true;
        if (els.btnSaveExtract) els.btnSaveExtract.disabled = true;
        return loop;
    }

    if (commit) {
        state.loopStart = loop.startTime;
        state.loopEnd = loop.endTime;
        clearExtractedCache();
    }

    setLoopInputsInvalid(false);
    setLoopValidation(`Selection ${formatTime(loop.startTime)} - ${formatTime(loop.endTime)}`);
    showExtractCard();
    updateLoopButtonState();
    return loop;
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.setAttribute('role', type === 'error' || type === 'warning' ? 'alert' : 'status');

    const region = els.toastRegion || document.body;
    region.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'toastOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

// Add toast animations
const toastStyles = document.createElement('style');
toastStyles.textContent = `
    @keyframes toastIn { from { opacity: 0; transform: translateX(-50%) translateY(20px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
    @keyframes toastOut { from { opacity: 1; transform: translateX(-50%) translateY(0); } to { opacity: 0; transform: translateX(-50%) translateY(20px); } }
`;
document.head.appendChild(toastStyles);

// ============================================
// Waveform
// ============================================
function resetWaveform(message = 'Waveform en attente') {
    state.waveformToken++;
    state.waveformPeaks = [];
    state.waveformMode = 'empty';
    state.waveDrag = null;

    if (els.waveformPanel) els.waveformPanel.classList.add('hidden');
    if (els.waveformStatus) els.waveformStatus.textContent = message;
    if (els.waveformCurrent) els.waveformCurrent.textContent = '00:00';
    if (els.waveformLoopLabel) els.waveformLoopLabel.textContent = 'Loop: --:-- - --:--';
    if (els.waveformSelection) {
        els.waveformSelection.style.left = '0%';
        els.waveformSelection.style.width = '0%';
    }
    if (els.waveformPlayhead) els.waveformPlayhead.style.left = '0%';
    renderWaveform();
}

function generatePlaceholderPeaks(count = WAVEFORM_PEAK_COUNT) {
    return Array.from({ length: count }, (_, index) => {
        const phase = index / Math.max(1, count - 1);
        return 0.25 + Math.abs(Math.sin(phase * Math.PI * 8)) * 0.45;
    });
}

function generatePeaksFromBuffer(buffer, count = WAVEFORM_PEAK_COUNT) {
    const channelData = buffer.getChannelData(0);
    const blockSize = Math.max(1, Math.floor(channelData.length / count));
    const peaks = [];

    for (let i = 0; i < count; i++) {
        const start = i * blockSize;
        const end = Math.min(start + blockSize, channelData.length);
        let peak = 0;
        for (let j = start; j < end; j++) {
            const value = Math.abs(channelData[j]);
            if (value > peak) peak = value;
        }
        peaks.push(Math.max(0.04, Math.min(1, peak)));
    }

    return peaks;
}

function renderWaveform() {
    if (!els.waveformCanvas) return;

    const canvas = els.waveformCanvas;
    const track = els.waveformTrack;
    const rect = track ? track.getBoundingClientRect() : { width: 0, height: 0 };
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));
    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const peaks = state.waveformPeaks.length ? state.waveformPeaks : generatePlaceholderPeaks();
    const barGap = 2;
    const barWidth = Math.max(2, (width - (peaks.length - 1) * barGap) / peaks.length);
    const center = height / 2;

    ctx.fillStyle = '#2A2A2A';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = state.waveformMode === 'placeholder' ? '#6F7A55' : '#A9A9A9';

    peaks.forEach((peak, index) => {
        const barHeight = Math.max(3, peak * (height - 18));
        const x = index * (barWidth + barGap);
        const y = center - barHeight / 2;
        ctx.fillRect(x, y, barWidth, barHeight);
    });
}

async function prepareWaveform() {
    if (!state.currentAudio) return;

    const token = ++state.waveformToken;
    const duration = getAudioDuration();
    els.waveformPanel.classList.remove('hidden');
    els.waveformStatus.textContent = 'Analyse de la waveform...';

    if (!duration || duration >= DETAILED_WAVEFORM_MAX_DURATION) {
        state.waveformPeaks = generatePlaceholderPeaks();
        state.waveformMode = 'placeholder';
        renderWaveform();
        updateWaveformUI();
        els.waveformStatus.textContent = 'Wave bar simplifiée pour préserver les performances sur audio long.';
        return;
    }

    let audioContext = null;
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const buffer = await fetchAudioBuffer(audioContext, state.currentAudioBlob || state.currentAudio);
        if (token !== state.waveformToken) return;

        state.waveformPeaks = generatePeaksFromBuffer(buffer);
        state.waveformMode = 'detailed';
        renderWaveform();
        updateWaveformUI();
        els.waveformStatus.textContent = 'Clique pour déplacer la lecture. Déplace la sélection pour ajuster la loop.';
    } catch (error) {
        console.error('Waveform generation error:', error);
        state.waveformPeaks = generatePlaceholderPeaks();
        state.waveformMode = 'placeholder';
        renderWaveform();
        updateWaveformUI();
        els.waveformStatus.textContent = 'Wave bar simplifiée affichée.';
    } finally {
        if (audioContext) {
            audioContext.close().catch((error) => console.error('AudioContext close error:', error));
        }
    }
}

function updateWaveformUI() {
    if (!els.waveformTrack || !state.currentAudio) return;

    const duration = getAudioDuration();
    const currentTime = Math.min(duration || 0, Math.max(0, els.audioPlayer.currentTime || 0));
    const start = Math.min(duration || 0, Math.max(0, state.loopStart || 0));
    const end = Math.min(duration || 0, Math.max(start, state.loopEnd || 0));
    const playheadPercent = duration ? (currentTime / duration) * 100 : 0;
    const selectionLeft = duration ? (start / duration) * 100 : 0;
    const selectionWidth = duration ? ((end - start) / duration) * 100 : 0;

    els.waveformCurrent.textContent = formatTime(currentTime);
    els.waveformLoopLabel.textContent = `Loop: ${formatTime(start)} - ${formatTime(end)}`;
    els.waveformPlayhead.style.left = `${playheadPercent}%`;
    els.waveformSelection.style.left = `${selectionLeft}%`;
    els.waveformSelection.style.width = `${selectionWidth}%`;
    els.waveformTrack.setAttribute('aria-valuemax', String(Math.floor(duration || 0)));
    els.waveformTrack.setAttribute('aria-valuenow', String(Math.floor(currentTime)));
}

function timeFromWaveformEvent(event) {
    const rect = els.waveformTrack.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    return ratio * getAudioDuration();
}

function syncLoopInputsFromState() {
    els.loopStart.value = formatTime(state.loopStart);
    els.loopEnd.value = formatTime(state.loopEnd);
    clearExtractedCache();
    setLoopInputsInvalid(false);
    setLoopValidation(`Selection ${formatTime(state.loopStart)} - ${formatTime(state.loopEnd)}`);
    showExtractCard();
    updateLoopButtonState();
    updateWaveformUI();
}

function updateLoopFromWaveDrag(event) {
    if (!state.waveDrag || state.loopSelectionLocked) return;

    const duration = getAudioDuration();
    if (!duration) return;

    const eventTime = timeFromWaveformEvent(event);
    const minDuration = MIN_LOOP_DURATION;

    if (state.waveDrag.type === 'start') {
        state.loopStart = Math.min(Math.max(0, eventTime), state.loopEnd - minDuration);
    } else if (state.waveDrag.type === 'end') {
        state.loopEnd = Math.max(Math.min(duration, eventTime), state.loopStart + minDuration);
    } else if (state.waveDrag.type === 'move') {
        const delta = eventTime - state.waveDrag.anchorTime;
        const selectionDuration = state.waveDrag.initialEnd - state.waveDrag.initialStart;
        let nextStart = state.waveDrag.initialStart + delta;
        nextStart = Math.max(0, Math.min(duration - selectionDuration, nextStart));
        state.loopStart = nextStart;
        state.loopEnd = nextStart + selectionDuration;
    }

    syncLoopInputsFromState();
}

function handleWaveformPointerDown(event) {
    if (!state.currentAudio || !getAudioDuration()) return;

    const handle = event.target.closest('[data-wave-handle]');
    const selection = event.target.closest('[data-wave-action="move"]');

    if (handle || selection) {
        if (state.loopSelectionLocked) {
            els.audioPlayer.currentTime = timeFromWaveformEvent(event);
            updateWaveformUI();
            return;
        }

        event.preventDefault();
        const type = handle ? handle.dataset.waveHandle : 'move';
        state.waveDrag = {
            type,
            anchorTime: timeFromWaveformEvent(event),
            initialStart: state.loopStart,
            initialEnd: state.loopEnd,
            moved: false
        };
        els.waveformTrack.setPointerCapture(event.pointerId);
        return;
    }

    els.audioPlayer.currentTime = timeFromWaveformEvent(event);
    updateWaveformUI();
}

function handleWaveformPointerMove(event) {
    if (!state.waveDrag) return;
    event.preventDefault();
    state.waveDrag.moved = true;
    updateLoopFromWaveDrag(event);
}

function handleWaveformPointerUp(event) {
    if (!state.waveDrag) return;
    const drag = state.waveDrag;
    try {
        els.waveformTrack.releasePointerCapture(event.pointerId);
    } catch (error) {
        console.error('Waveform pointer release error:', error);
    }
    if (drag.type === 'move' && !drag.moved) {
        els.audioPlayer.currentTime = drag.anchorTime;
        updateWaveformUI();
    }
    state.waveDrag = null;
}

function handleWaveformKeydown(event) {
    if (!state.currentAudio) return;

    const duration = getAudioDuration();
    const step = event.shiftKey ? 5 : 1;

    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        const direction = event.key === 'ArrowRight' ? 1 : -1;
        els.audioPlayer.currentTime = Math.min(duration, Math.max(0, els.audioPlayer.currentTime + direction * step));
        updateWaveformUI();
    } else if (event.key === 'Home') {
        event.preventDefault();
        els.audioPlayer.currentTime = 0;
        updateWaveformUI();
    } else if (event.key === 'End') {
        event.preventDefault();
        els.audioPlayer.currentTime = duration;
        updateWaveformUI();
    }
}

// ============================================
// IndexedDB Storage (fallback for large files)
// ============================================
async function initIndexedDB() {
    return new Promise((resolve, reject) => {
        if (!window.indexedDB) {
            resolve(false);
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            console.warn('IndexedDB not available, using localStorage');
            resolve(false);
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            resolve(true);
        };

        request.onupgradeneeded = (event) => {
            const database = event.target.result;
            if (!database.objectStoreNames.contains(STORE_NAME)) {
                database.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
            if (!database.objectStoreNames.contains(METADATA_STORE_NAME)) {
                database.createObjectStore(METADATA_STORE_NAME, { keyPath: 'id' });
            }
            if (!database.objectStoreNames.contains(BLOB_STORE_NAME)) {
                database.createObjectStore(BLOB_STORE_NAME, { keyPath: 'id' });
            }
        };
    });
}

async function saveLegacyToIndexedDB(audioItem) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('IndexedDB not initialized'));
            return;
        }
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(audioItem);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

async function loadLegacyFromIndexedDB() {
    return new Promise((resolve, reject) => {
        if (!db) {
            resolve([]);
            return;
        }
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
    });
}

async function deleteLegacyFromIndexedDB(id) {
    return new Promise((resolve, reject) => {
        if (!db) {
            resolve();
            return;
        }
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// ============================================
// Storage Functions (with fallback)
// ============================================
async function saveAudioItem(audioItem) {
    if (useIndexedDB && getModernStorageAvailable()) {
        let blob = audioItem._blob || null;

        if (!blob && audioItem.dataURL) {
            blob = dataURLToBlob(audioItem.dataURL);
        }

        const metadata = normalizeAudioMetadata(audioItem, blob);
        if (blob) {
            await saveBlobToIndexedDB(metadata.blobId, blob);
        }
        await saveMetadataToIndexedDB(metadata);

        Object.assign(audioItem, metadata);
        delete audioItem.dataURL;
        delete audioItem._blob;
        return true;
    }

    if (audioItem._blob && !audioItem.dataURL) {
        audioItem.dataURL = await readBlobAsDataURL(audioItem._blob);
    }

    return false;
}

async function migrateLegacyItemsToModernStorage(items) {
    if (!useIndexedDB || !getModernStorageAvailable()) return items;

    const migrated = [];
    for (const item of items) {
        try {
            await saveAudioItem(item);
            migrated.push(stripRuntimeFields(item));
        } catch (error) {
            console.error('Legacy audio migration failed:', error);
            migrated.push(item);
        }
    }

    return migrated;
}

async function getAudioBlobForItem(item) {
    if (!item) return null;
    if (item._blob) return item._blob;

    if (item.blobId && useIndexedDB && getModernStorageAvailable()) {
        const blob = await loadBlobFromIndexedDB(item.blobId);
        if (blob) return blob;
    }

    if (item.dataURL) {
        return dataURLToBlob(item.dataURL);
    }

    return null;
}

async function getAudioPlaybackSource(item) {
    const blob = await getAudioBlobForItem(item);
    if (blob) {
        return {
            blob,
            url: URL.createObjectURL(blob),
            extension: item.format || getAudioExtensionFromDataURL(item.dataURL)
        };
    }

    if (item.dataURL) {
        return {
            blob: null,
            url: item.dataURL,
            extension: item.format || getAudioExtensionFromDataURL(item.dataURL)
        };
    }

    throw new Error('Audio blob unavailable');
}

async function loadLibrary() {
    try {
        if (useIndexedDB && getModernStorageAvailable()) {
            const metadata = await loadMetadataFromIndexedDB();
            if (metadata.length > 0) {
                state.library = metadata;
                return;
            }
        }

        if (useIndexedDB && db) {
            const items = await loadLegacyFromIndexedDB();
            if (items.length > 0) {
                state.library = await migrateLegacyItemsToModernStorage(items);
                return;
            }
        }

        // Fallback to localStorage
        const data = localStorage.getItem(STORAGE_KEY);
        const storedItems = data ? JSON.parse(data) : [];

        state.library = await migrateLegacyItemsToModernStorage(storedItems);
    } catch (e) {
        console.error('Error loading library:', e);
        state.library = [];
    }
}

async function saveLibrary() {
    try {
        if (useIndexedDB && getModernStorageAvailable()) {
            for (const item of state.library) {
                await saveAudioItem(item);
            }
            const metadata = state.library.map(item => stripRuntimeFields(item));
            try {
                localStorage.setItem(STORAGE_KEY + '_meta', JSON.stringify(metadata));
            } catch (e) { }
            return true;
        } else {
            // Try localStorage
            for (const item of state.library) {
                if (item._blob && !item.dataURL) {
                    item.dataURL = await readBlobAsDataURL(item._blob);
                }
            }
            const jsonData = JSON.stringify(state.library.map(item => {
                const { _blob, objectUrl, ...storedItem } = item;
                return storedItem;
            }));
            try {
                localStorage.setItem(STORAGE_KEY, jsonData);
                return true;
            } catch (quotaError) {
                // Quota exceeded, try to use IndexedDB
                if (db) {
                    useIndexedDB = true;
                    for (const item of state.library) {
                        await saveAudioItem(item);
                    }
                    showToast('Stockage optimisé activé', 'success');
                    return true;
                } else {
                    console.error('Storage quota exceeded:', quotaError);
                    showToast(MESSAGES.STORAGE_FULL, 'error');
                    return false;
                }
            }
        }
    } catch (e) {
        console.error('Error saving library:', e);
        showToast(getUserAudioErrorMessage(e), 'error');
        return false;
    }
}

async function deleteFromStorage(itemOrId) {
    const id = typeof itemOrId === 'string' ? itemOrId : itemOrId.id;
    const blobId = typeof itemOrId === 'string' ? itemOrId : (itemOrId.blobId || itemOrId.id);
    if (useIndexedDB && db) {
        await Promise.all([
            deleteLegacyFromIndexedDB(id),
            deleteModernFromIndexedDB(id),
            blobId !== id ? deleteModernFromIndexedDB(blobId) : Promise.resolve()
        ]);
    }
}

// ============================================
// Navigation
// ============================================
function switchScreen(screenName) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(`screen-${screenName}`).classList.add('active');

    els.navBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.screen === screenName);
        btn.setAttribute('aria-current', btn.dataset.screen === screenName ? 'page' : 'false');
    });

    const headers = {
        loop: { title: 'Audio Loop', subtitle: 'Importer, boucler, enregistrer' },
        fusion: { title: 'Fusion', subtitle: 'Combiner deux audios' },
        settings: { title: 'Paramètres', subtitle: 'Options de l\'application' }
    };

    els.headerTitle.textContent = headers[screenName].title;
    els.headerSubtitle.textContent = headers[screenName].subtitle;

    if (screenName === 'fusion') {
        populateFusionSelects();
    }
}

// ============================================
// Audio Import
// ============================================
function handleAudioImport(file) {
    if (!file) return;

    if (!isSupportedAudioFile(file)) {
        showToast(MESSAGES.UNSUPPORTED_FORMAT, 'error');
        els.audioInput.value = '';
        return;
    }

    if (file.size > MAX_AUDIO_FILE_SIZE) {
        showToast(MESSAGES.FILE_TOO_LARGE, 'error');
        els.audioInput.value = '';
        return;
    }

    const objectUrl = URL.createObjectURL(file);
    const audioName = file.name.replace(/\.[^/.]+$/, '');
    setCurrentAudioSource({
        url: objectUrl,
        blob: file,
        name: audioName,
        extension: getFileExtension(file.name) || getAudioExtensionFromMimeType(file.type)
    });
    clearExtractedCache();

    els.fileName.textContent = file.name;
    els.fileName.classList.add('active');
    els.audioPlayer.src = state.currentAudio;
    els.playerContainer.classList.remove('hidden');
    els.btnToggleLoop.disabled = false;
    els.btnSaveAudio.disabled = false;

    state.loopEnabled = false;
    state.loopSelectionLocked = false;
    state.loopStart = 0;
    state.loopEnd = 0;
    state.pendingLoop = null;
    els.loopStart.value = '00:00';
    els.loopEnd.value = '';
    els.extractCard.classList.add('hidden');
    els.btnExtractLoop.disabled = true;
    els.btnSaveExtract.disabled = true;
    updateLoopButtonState();
    resetWaveform('Waveform en attente du chargement audio');
}

// ============================================
// Audio Player & Loop
// ============================================
function setupAudioPlayer() {
    els.audioPlayer.addEventListener('loadedmetadata', () => {
        const duration = els.audioPlayer.duration;
        els.audioDuration.textContent = `Durée: ${formatTime(duration)}`;
        const pendingStart = state.pendingLoop ? state.pendingLoop.start : 0;
        const pendingEnd = state.pendingLoop && state.pendingLoop.end ? state.pendingLoop.end : duration;
        state.loopStart = Math.max(0, Math.min(duration, pendingStart));
        state.loopEnd = duration < MIN_LOOP_DURATION
            ? duration
            : Math.max(state.loopStart + MIN_LOOP_DURATION, Math.min(duration, pendingEnd));
        els.loopStart.value = formatTime(state.loopStart);
        els.loopEnd.value = formatTime(state.loopEnd);
        state.pendingLoop = null;
        setLoopInputsInvalid(false);
        setLoopValidation(`Selection ${formatTime(state.loopStart)} - ${formatTime(state.loopEnd)}`);
        updateLoopButtonState();
        if (duration >= LONG_AUDIO_DURATION) {
            showToast(MESSAGES.LONG_AUDIO, 'warning');
        }
        showExtractCard();
        prepareWaveform();
    });

    els.audioPlayer.addEventListener('timeupdate', () => {
        updateWaveformUI();
        if (!state.loopEnabled) return;
        if (els.audioPlayer.currentTime >= state.loopEnd) {
            els.audioPlayer.currentTime = state.loopStart;
            updateWaveformUI();
        }
    });

    els.audioPlayer.addEventListener('ended', () => {
        if (state.loopEnabled) {
            els.audioPlayer.currentTime = state.loopStart;
            els.audioPlayer.play();
        }
    });
}

function toggleLoop() {
    const loop = applyLoopInputs({ showError: true });
    if (!loop.valid) return;

    state.loopStart = loop.startTime;
    state.loopEnd = loop.endTime;

    state.loopEnabled = !state.loopEnabled;
    updateLoopButtonState();

    if (state.loopEnabled) {
        els.audioPlayer.currentTime = state.loopStart;
        updateWaveformUI();
        els.audioPlayer.play();
    }
}

function updateLoopButtonState() {
    const btnSpan = els.btnToggleLoop.querySelector('span');
    if (state.loopEnabled) {
        els.btnToggleLoop.classList.add('active');
        els.btnToggleLoop.setAttribute('aria-pressed', 'true');
        btnSpan.textContent = 'Désactiver';
    } else {
        els.btnToggleLoop.classList.remove('active');
        els.btnToggleLoop.setAttribute('aria-pressed', 'false');
        btnSpan.textContent = 'Activer Loop';
    }

    const hasAudio = !!state.currentAudio;
    if (els.btnGoLoopStart) els.btnGoLoopStart.disabled = !hasAudio;
    if (els.btnClearLoop) els.btnClearLoop.disabled = !hasAudio;
    if (els.btnLockLoop) els.btnLockLoop.disabled = !hasAudio;

    if (!hasAudio) {
        state.loopSelectionLocked = false;
    }
    updateLoopEditLockState();

    // Show/hide extract card based on valid loop times
    const hasValidLoop = state.loopStart >= 0 && state.loopEnd > state.loopStart;
    if (hasValidLoop && state.currentAudio) {
        els.extractCard.classList.remove('hidden');
        els.btnExtractLoop.disabled = false;
        els.btnSaveExtract.disabled = false;
        const defaultName = `${state.currentAudioName || 'Audio'} (${formatTime(state.loopStart)}-${formatTime(state.loopEnd)})`;
        if (!els.extractName.value) {
            els.extractName.value = defaultName;
        }
    }
    updateWaveformUI();
}

function showExtractCard() {
    const loop = validateLoopInputs({ showError: false });

    if (!loop.valid || !state.currentAudio) {
        els.extractCard.classList.add('hidden');
        els.btnExtractLoop.disabled = true;
        els.btnSaveExtract.disabled = true;
        return;
    }

    state.loopStart = loop.startTime;
    state.loopEnd = loop.endTime;
    els.extractCard.classList.remove('hidden');
    els.btnExtractLoop.disabled = false;
    els.btnSaveExtract.disabled = false;
    const defaultName = `${state.currentAudioName || 'Audio'} (${formatTime(state.loopStart)}-${formatTime(state.loopEnd)})`;
    els.extractName.value = defaultName;
    updateWaveformUI();
}

function goToLoopStart() {
    const loop = applyLoopInputs({ showError: true });
    if (!loop.valid) return;

    els.audioPlayer.currentTime = loop.startTime;
    updateWaveformUI();
}

function clearLoopSelection() {
    if (!state.currentAudio) return;

    const duration = getAudioDuration();
    if (!duration) return;

    state.loopEnabled = false;
    state.loopSelectionLocked = false;
    state.loopStart = 0;
    state.loopEnd = duration;
    state.pendingLoop = null;
    syncLoopInputsFromState();
    showToast('Selection reinitialisee.', 'success');
}

function toggleLoopSelectionLock() {
    if (!state.currentAudio) return;

    const loop = applyLoopInputs({ showError: true });
    if (!loop.valid) return;

    state.loopSelectionLocked = !state.loopSelectionLocked;
    updateLoopEditLockState();
    setLoopValidation(state.loopSelectionLocked ? 'Selection verrouillee' : `Selection ${formatTime(state.loopStart)} - ${formatTime(state.loopEnd)}`);
}

function updateExportProgress(progress, label) {
    const percent = Math.max(0, Math.min(100, Math.round(progress || 0)));

    if (els.exportProgress) els.exportProgress.classList.remove('hidden');
    if (els.exportProgressBar) els.exportProgressBar.style.width = `${percent}%`;
    if (els.exportProgressValue) els.exportProgressValue.textContent = `${percent}%`;
    if (els.exportProgressLabel) els.exportProgressLabel.textContent = label || MESSAGES.EXPORT_IN_PROGRESS;
}

function resetExportProgress() {
    if (els.exportProgress) els.exportProgress.classList.add('hidden');
    if (els.exportProgressBar) els.exportProgressBar.style.width = '0%';
    if (els.exportProgressValue) els.exportProgressValue.textContent = '0%';
    if (els.exportProgressLabel) els.exportProgressLabel.textContent = 'Export de la boucle...';
}

function terminateExportWorker() {
    if (state.exportWorker) {
        state.exportWorker.terminate();
        state.exportWorker = null;
    }
    state.exportJobId = null;
}

function cancelCurrentExport() {
    state.exportCancelled = true;

    if (state.exportWorker && state.exportJobId) {
        state.exportWorker.postMessage({
            type: 'cancel',
            jobId: state.exportJobId
        });
    }

    updateExportProgress(0, MESSAGES.EXPORT_CANCELLED);
    showToast(MESSAGES.EXPORT_CANCELLED, 'warning');
}

function setExportControlsBusy(isBusy, activeButton = null) {
    els.btnExtractLoop.disabled = isBusy || !state.currentAudio;
    els.btnSaveExtract.disabled = isBusy || !state.currentAudio;
    if (els.btnCancelExport) els.btnCancelExport.disabled = !isBusy;

    if (!isBusy) {
        setButtonText(els.btnExtractLoop, 'Extraire & Télécharger');
        setButtonText(els.btnSaveExtract, 'Enregistrer Loop');
        return;
    }

    if (activeButton === 'download') {
        setButtonText(els.btnExtractLoop, 'Export...');
        setButtonText(els.btnSaveExtract, 'Enregistrer Loop');
    } else {
        setButtonText(els.btnExtractLoop, 'Extraire & Télécharger');
        setButtonText(els.btnSaveExtract, 'Export...');
    }
}

function exportWithWorker(payload) {
    return new Promise((resolve, reject) => {
        terminateExportWorker();

        if (state.exportCancelled) {
            reject(new Error(MESSAGES.EXPORT_CANCELLED));
            return;
        }

        const worker = new Worker('./export-worker.js');
        state.exportWorker = worker;
        state.exportJobId = payload.jobId;

        worker.onmessage = (event) => {
            const data = event.data || {};
            if (data.jobId !== payload.jobId) return;

            if (data.type === 'progress') {
                updateExportProgress(data.progress, data.label);
                return;
            }

            if (data.type === 'complete') {
                terminateExportWorker();
                updateExportProgress(100, 'Export termine.');
                resolve({
                    blob: data.blob,
                    extension: data.extension,
                    duration: data.duration
                });
                return;
            }

            if (data.type === 'error') {
                terminateExportWorker();
                reject(new Error(data.message || 'Export impossible.'));
            }
        };

        worker.onerror = (error) => {
            terminateExportWorker();
            reject(error);
        };

        const { transferables, ...message } = payload;
        worker.postMessage(message, transferables);
    });
}

async function createLoopExport(format) {
    const loop = validateLoopInputs();
    if (!loop.valid) return null;

    const loopDuration = loop.endTime - loop.startTime;
    if (loopDuration > MAX_LOOP_EXPORT_DURATION) {
        throw new Error(MESSAGES.EXPORT_TOO_LONG);
    }

    updateExportProgress(5, 'Lecture du fichier...');
    state.exportCancelled = false;

    let audioContext = null;
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const buffer = await fetchAudioBuffer(audioContext, state.currentAudioBlob || state.currentAudio);
        if (state.exportCancelled) {
            throw new Error(MESSAGES.EXPORT_CANCELLED);
        }
        updateExportProgress(EXPORT_PROGRESS_DECODE, 'Preparation du worker...');

        const sampleRate = buffer.sampleRate;
        const startSample = Math.floor(loop.startTime * sampleRate);
        const endSample = Math.min(Math.floor(loop.endTime * sampleRate), buffer.length);
        const extractedLength = endSample - startSample;

        if (extractedLength <= 0) {
            throw new Error(MESSAGES.INVALID_LOOP);
        }

        const channelCount = format === 'mp3'
            ? Math.min(2, buffer.numberOfChannels)
            : buffer.numberOfChannels;
        const channels = [];
        const transferables = [];

        for (let channel = 0; channel < channelCount; channel++) {
            const channelData = new Float32Array(buffer.getChannelData(channel));
            channels.push(channelData);
            transferables.push(channelData.buffer);
        }

        return await exportWithWorker({
            type: 'export',
            jobId: generateId(),
            format,
            channels,
            sampleRate,
            startSample,
            endSample,
            transferables
        });
    } finally {
        if (audioContext) {
            audioContext.close().catch((error) => console.error('AudioContext close error:', error));
        }
    }
}

async function saveMetadataToIndexedDB(metadata) {
    return new Promise((resolve, reject) => {
        if (!getModernStorageAvailable()) {
            reject(new Error('IndexedDB modern stores unavailable'));
            return;
        }

        const transaction = db.transaction([METADATA_STORE_NAME], 'readwrite');
        const store = transaction.objectStore(METADATA_STORE_NAME);
        const request = store.put(metadata);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

async function saveBlobToIndexedDB(id, blob) {
    return new Promise((resolve, reject) => {
        if (!getModernStorageAvailable()) {
            reject(new Error('IndexedDB blob store unavailable'));
            return;
        }

        const transaction = db.transaction([BLOB_STORE_NAME], 'readwrite');
        const store = transaction.objectStore(BLOB_STORE_NAME);
        const request = store.put({ id, blob });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

async function loadMetadataFromIndexedDB() {
    return new Promise((resolve, reject) => {
        if (!getModernStorageAvailable()) {
            resolve([]);
            return;
        }

        const transaction = db.transaction([METADATA_STORE_NAME], 'readonly');
        const store = transaction.objectStore(METADATA_STORE_NAME);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
    });
}

async function loadBlobFromIndexedDB(id) {
    return new Promise((resolve, reject) => {
        if (!getModernStorageAvailable()) {
            resolve(null);
            return;
        }

        const transaction = db.transaction([BLOB_STORE_NAME], 'readonly');
        const store = transaction.objectStore(BLOB_STORE_NAME);
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result ? request.result.blob : null);
        request.onerror = () => reject(request.error);
    });
}

async function deleteModernFromIndexedDB(id) {
    if (!getModernStorageAvailable()) return;

    await Promise.all([
        new Promise((resolve, reject) => {
            const transaction = db.transaction([METADATA_STORE_NAME], 'readwrite');
            const store = transaction.objectStore(METADATA_STORE_NAME);
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        }),
        new Promise((resolve, reject) => {
            const transaction = db.transaction([BLOB_STORE_NAME], 'readwrite');
            const store = transaction.objectStore(BLOB_STORE_NAME);
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        })
    ]);
}

async function extractLoop() {
    if (!state.currentAudio) return;

    setExportControlsBusy(true, 'download');
    resetExportProgress();
    showToast(MESSAGES.EXPORT_IN_PROGRESS, 'info');

    try {
        const format = getSelectedFormat('extract-format');
        const result = await createLoopExport(format);
        if (!result) return;

        state.extractedBlob = result.blob;
        state.extractedFormat = result.extension;

        const extractName = sanitizeFileName(els.extractName.value.trim() || 'loop_extract');
        triggerDownload(result.blob, extractName, result.extension);
        showToast(MESSAGES.EXPORT_SUCCESS);
    } catch (error) {
        console.error('Extract error:', error);
        showToast(getUserAudioErrorMessage(error), 'error');
    } finally {
        terminateExportWorker();
        setExportControlsBusy(false);
    }
}

async function saveExtractedLoop() {
    if (!state.currentAudio) return;

    setExportControlsBusy(true, 'save');
    resetExportProgress();
    showToast(MESSAGES.EXPORT_IN_PROGRESS, 'info');

    try {
        const format = getSelectedFormat('extract-format');
        const result = await createLoopExport(format);
        if (!result) return;

        const extractName = sanitizeFileName(els.extractName.value.trim() || `${state.currentAudioName} (loop)`);
        const audioItem = {
            id: generateId(),
            nom: extractName,
            type: 'import',
            format: result.extension,
            _blob: result.blob,
            size: result.blob.size,
            duration: result.duration,
            dateCreation: new Date().toISOString(),
            loopStart: 0,
            loopEnd: 0
        };

        state.library.push(audioItem);
        const saved = await saveLibrary();
        if (!saved) {
            state.library = state.library.filter(item => item.id !== audioItem.id);
            return;
        }

        renderLibrary();
        populateFusionSelects();
        clearExtractedCache();
        showToast('Loop enregistrée dans la bibliothèque !');
    } catch (error) {
        console.error('Save extract error:', error);
        showToast(getUserAudioErrorMessage(error), 'error');
    } finally {
        terminateExportWorker();
        setExportControlsBusy(false);
    }
}

// ============================================
// Library Management
// ============================================
async function saveCurrentAudio() {
    if (!state.currentAudio) return;

    const audioItem = {
        id: generateId(),
        nom: sanitizeFileName(state.currentAudioName || 'Audio sans nom'),
        type: 'import',
        format: state.currentAudioExtension || getAudioExtensionFromDataURL(state.currentAudio),
        _blob: state.currentAudioBlob,
        size: state.currentAudioBlob ? state.currentAudioBlob.size : 0,
        duration: getAudioDuration(),
        dateCreation: new Date().toISOString(),
        loopStart: parseTime(els.loopStart.value || '00:00'),
        loopEnd: parseTime(els.loopEnd.value || '00:00')
    };

    state.library.push(audioItem);
    const saved = await saveLibrary();
    if (!saved) {
        state.library = state.library.filter(item => item.id !== audioItem.id);
        return;
    }
    renderLibrary();
    showToast('Audio enregistré !');
}

function renderLibrary() {
    els.libraryCount.textContent = `${state.library.length} audio${state.library.length !== 1 ? 's' : ''}`;

    if (state.library.length === 0) {
        els.libraryList.innerHTML = `
            <div class="empty-state empty-state-panel">
                <p>Aucun audio enregistre.</p>
                <button class="btn btn-neutral btn-small" data-empty-action="import" type="button">
                    <span>Importer un audio</span>
                </button>
            </div>
        `;
        return;
    }

    const search = state.librarySearch.trim().toLowerCase();
    const items = state.library
        .filter(item => !search || String(item.nom || '').toLowerCase().includes(search))
        .sort((a, b) => {
            if (state.librarySort === 'oldest') {
                return new Date(a.dateCreation || 0) - new Date(b.dateCreation || 0);
            }
            if (state.librarySort === 'name') {
                return String(a.nom || '').localeCompare(String(b.nom || ''), 'fr');
            }
            if (state.librarySort === 'duration') {
                return (Number(b.duration) || 0) - (Number(a.duration) || 0);
            }
            if (state.librarySort === 'size') {
                return (Number(b.size) || 0) - (Number(a.size) || 0);
            }
            return new Date(b.dateCreation || 0) - new Date(a.dateCreation || 0);
        });

    if (items.length === 0) {
        els.libraryList.innerHTML = `
            <div class="empty-state empty-state-panel">
                <p>Aucun resultat pour cette recherche.</p>
                <button class="btn btn-neutral btn-small" data-empty-action="clear-search" type="button">
                    <span>Effacer la recherche</span>
                </button>
            </div>
        `;
        return;
    }

    els.libraryList.innerHTML = items.map(item => {
        const itemType = item.type === 'fusion' ? 'fusion' : 'import';
        const itemName = escapeHtml(item.nom || 'Audio sans nom');
        const itemLabel = escapeAttribute(item.nom || 'Audio sans nom');
        const itemId = escapeAttribute(item.id);
        const itemFormat = escapeHtml(String(item.format || 'audio').toUpperCase());
        const itemDuration = formatTime(Number(item.duration) || 0);
        const itemSize = formatFileSize(item.size);
        const itemDate = escapeHtml(formatDateShort(item.dateCreation));
        return `
            <div class="library-item" data-id="${itemId}">
                <div class="library-item-info">
                    <div class="library-item-name">${itemName}</div>
                    <div class="library-item-meta">
                        <span class="badge ${itemType}">${itemType === 'import' ? 'Import' : 'Fusion'}</span>
                        <span>${itemFormat}</span>
                        <span>${itemDuration}</span>
                        <span>${itemSize}</span>
                        <span>${itemDate}</span>
                    </div>
                </div>
                <div class="library-item-actions">
                    <button class="btn btn-neutral btn-icon" data-library-action="play" data-id="${itemId}" aria-label="Écouter ${itemLabel}" title="Écouter">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                    </button>
                    <button class="btn btn-neutral btn-icon" data-library-action="download" data-id="${itemId}" aria-label="Télécharger ${itemLabel}" title="Télécharger">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    </button>
                    <button class="btn btn-neutral btn-icon" data-library-action="rename" data-id="${itemId}" aria-label="Renommer ${itemLabel}" title="Renommer">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button class="btn btn-delete btn-icon" data-library-action="delete" data-id="${itemId}" aria-label="Supprimer ${itemLabel}" title="Supprimer">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

async function playLibraryAudio(id) {
    const item = state.library.find(a => a.id === id);
    if (!item) return;

    try {
        const source = await getAudioPlaybackSource(item);
        setCurrentAudioSource({
            url: source.url,
            blob: source.blob,
            name: item.nom,
            extension: source.extension
        });
        clearExtractedCache();
        els.audioPlayer.src = state.currentAudio;
        els.playerContainer.classList.remove('hidden');
        els.fileName.textContent = item.nom;
        els.fileName.classList.add('active');
        els.btnToggleLoop.disabled = false;
        els.btnSaveAudio.disabled = false;

        state.pendingLoop = {
            start: Number(item.loopStart) || 0,
            end: Number(item.loopEnd) || 0
        };
        els.loopStart.value = formatTime(state.pendingLoop.start);
        if (state.pendingLoop.end) {
            els.loopEnd.value = formatTime(state.pendingLoop.end);
        }

        state.loopEnabled = false;
        state.loopSelectionLocked = false;
        updateLoopButtonState();
        await els.audioPlayer.play();
    } catch (error) {
        console.error('Play library audio error:', error);
        showToast('Impossible de lire cet audio. Le fichier local est introuvable.', 'error');
    }
}

async function downloadAudio(id) {
    const item = state.library.find(a => a.id === id);
    if (!item) return;

    try {
        const blob = await getAudioBlobForItem(item);
        if (blob) {
            triggerDownload(blob, item.nom, item.format || 'wav');
            return;
        }

        if (item.dataURL) {
            const link = document.createElement('a');
            link.href = item.dataURL;
            link.download = `${sanitizeFileName(item.nom)}.${item.format || getAudioExtensionFromDataURL(item.dataURL)}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            showToast('Téléchargement démarré');
        }
    } catch (error) {
        console.error('Download audio error:', error);
        showToast('Impossible de télécharger cet audio.', 'error');
    }
}

async function deleteAudio(id) {
    if (!confirm('Supprimer cet audio ?')) return;

    const item = state.library.find(a => a.id === id);
    state.library = state.library.filter(a => a.id !== id);
    await deleteFromStorage(item || id);
    await saveLibrary();
    renderLibrary();
    populateFusionSelects();
    showToast('Audio supprimé');
}

// ============================================
// Rename Modal
// ============================================
function openRenameModal(id) {
    const item = state.library.find(a => a.id === id);
    if (!item) return;

    state.renameTarget = id;
    state.lastFocusedElement = document.activeElement;
    els.renameInput.value = item.nom;
    els.renameModal.classList.remove('hidden');
    setTimeout(() => els.renameInput.focus(), 100);
}

function closeRenameModal() {
    els.renameModal.classList.add('hidden');
    state.renameTarget = null;
    if (state.lastFocusedElement && typeof state.lastFocusedElement.focus === 'function') {
        state.lastFocusedElement.focus();
    }
    state.lastFocusedElement = null;
}

function keepFocusInRenameModal(event) {
    if (event.key !== 'Tab' || els.renameModal.classList.contains('hidden')) return;

    const focusable = els.renameModal.querySelectorAll('input, button');
    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
    }
}

async function confirmRename() {
    if (!state.renameTarget) return;

    const newName = els.renameInput.value.trim();
    if (!newName) {
        showToast('Veuillez entrer un nom', 'error');
        return;
    }

    const item = state.library.find(a => a.id === state.renameTarget);
    if (item) {
        item.nom = newName;
        await saveLibrary();
        renderLibrary();
        populateFusionSelects();
        showToast('Nom modifié');
    }

    closeRenameModal();
}

// ============================================
// Fusion
// ============================================
function populateFusionSelects() {
    const options = state.library.map(item =>
        `<option value="${escapeAttribute(item.id)}">${escapeHtml(item.nom)}</option>`
    ).join('');

    const defaultOption = '<option value="">-- Sélectionner --</option>';

    els.fusionSelectA.innerHTML = defaultOption + options;
    els.fusionSelectB.innerHTML = defaultOption + options;

    if (state.fusionAudioA && state.library.find(a => a.id === state.fusionAudioA)) {
        els.fusionSelectA.value = state.fusionAudioA;
    }
    if (state.fusionAudioB && state.library.find(a => a.id === state.fusionAudioB)) {
        els.fusionSelectB.value = state.fusionAudioB;
    }

    updateFusionButton();
}

function updateFusionButton() {
    const hasA = els.fusionSelectA.value !== '';
    const hasB = els.fusionSelectB.value !== '';
    const isDifferent = els.fusionSelectA.value !== els.fusionSelectB.value;
    els.btnFusion.disabled = !(hasA && hasB && isDifferent);
}

function removeSelectionA() {
    els.fusionSelectA.value = '';
    state.fusionAudioA = null;
    updateFusionButton();
}

function removeSelectionB() {
    els.fusionSelectB.value = '';
    state.fusionAudioB = null;
    updateFusionButton();
}

async function performFusion() {
    const idA = els.fusionSelectA.value;
    const idB = els.fusionSelectB.value;

    if (!idA || !idB) return;
    if (idA === idB) {
        showToast('Sélectionne deux audios différents pour la fusion.', 'error');
        return;
    }

    const audioA = state.library.find(a => a.id === idA);
    const audioB = state.library.find(a => a.id === idB);
    if (!audioA || !audioB) return;

    let audioContext = null;
    els.btnFusion.disabled = true;
    setButtonText(els.btnFusion, 'Fusion...');

    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const [blobA, blobB] = await Promise.all([
            getAudioBlobForItem(audioA),
            getAudioBlobForItem(audioB)
        ]);

        if (!blobA || !blobB) {
            throw new Error('Audio blob unavailable');
        }

        const [bufferA, bufferB] = await Promise.all([
            fetchAudioBuffer(audioContext, blobA),
            fetchAudioBuffer(audioContext, blobB)
        ]);

        const mergedLength = bufferA.length + bufferB.length;
        const numChannels = Math.max(bufferA.numberOfChannels, bufferB.numberOfChannels);
        const mergedBuffer = audioContext.createBuffer(numChannels, mergedLength, audioContext.sampleRate);

        for (let channel = 0; channel < numChannels; channel++) {
            const mergedData = mergedBuffer.getChannelData(channel);
            const aChannel = Math.min(channel, bufferA.numberOfChannels - 1);
            const bChannel = Math.min(channel, bufferB.numberOfChannels - 1);
            mergedData.set(bufferA.getChannelData(aChannel), 0);
            mergedData.set(bufferB.getChannelData(bChannel), bufferA.length);
        }

        const wavBlob = bufferToWave(mergedBuffer, mergedLength);
        state.fusionBlob = wavBlob;
        state.fusionBuffer = mergedBuffer;

        state.fusionResult = {
            nameA: audioA.nom,
            nameB: audioB.nom,
            format: 'wav',
            duration: mergedBuffer.duration
        };

        setFusionPreview(wavBlob, `${audioA.nom} + ${audioB.nom}`);
        els.fusionResultCard.classList.remove('hidden');
        showToast('Fusion terminée !');
    } catch (error) {
        console.error('Fusion error:', error);
        showToast(getUserAudioErrorMessage(error), 'error');
    } finally {
        if (audioContext) {
            audioContext.close().catch((error) => console.error('AudioContext close error:', error));
        }
        els.btnFusion.disabled = false;
        setButtonText(els.btnFusion, 'Fusionner A + B');
    }
}

async function fetchAudioBuffer(audioContext, source) {
    const arrayBuffer = source instanceof Blob
        ? await source.arrayBuffer()
        : await fetch(source).then(response => response.arrayBuffer());
    return audioContext.decodeAudioData(arrayBuffer);
}

function bufferToMP3(buffer) {
    if (typeof lamejs === 'undefined') {
        throw new Error('Bibliothèque MP3 (lamejs) non chargée');
    }

    const channels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const kbps = 128; // Standard quality

    // Initialize encoder
    const mp3encoder = new lamejs.Mp3Encoder(channels, sampleRate, kbps);
    const mp3Data = [];

    // Get samples (must be Int16)
    const left = new Int16Array(buffer.length);
    const right = channels > 1 ? new Int16Array(buffer.length) : undefined;

    const leftChannel = buffer.getChannelData(0);
    const rightChannel = channels > 1 ? buffer.getChannelData(1) : undefined;

    for (let i = 0; i < buffer.length; i++) {
        // Convert float -1.0...1.0 to int16 -32768...32767
        const sL = Math.max(-1, Math.min(1, leftChannel[i]));
        left[i] = sL < 0 ? sL * 0x8000 : sL * 0x7FFF;

        if (right) {
            const sR = Math.max(-1, Math.min(1, rightChannel[i]));
            right[i] = sR < 0 ? sR * 0x8000 : sR * 0x7FFF;
        }
    }

    // Encode
    const sampleBlockSize = 1152;
    for (let i = 0; i < buffer.length; i += sampleBlockSize) {
        const leftChunk = left.subarray(i, i + sampleBlockSize);
        const rightChunk = right ? right.subarray(i, i + sampleBlockSize) : undefined;

        const mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
        if (mp3buf.length > 0) {
            mp3Data.push(mp3buf);
        }
    }

    const endBuf = mp3encoder.flush();
    if (endBuf.length > 0) {
        mp3Data.push(endBuf);
    }

    return new Blob(mp3Data, { type: 'audio/mp3' });
}

function bufferToWave(buffer, length) {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const bytesPerSample = 2;
    const blockAlign = numChannels * bytesPerSample;
    const dataLength = length * blockAlign;
    const bufferLength = 44 + dataLength;

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
    for (let i = 0; i < length; i++) {
        for (let channel = 0; channel < numChannels; channel++) {
            const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
            view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
            offset += 2;
        }
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}

async function downloadFusion() {
    if (!state.fusionBlob || !state.fusionBuffer) return;

    const format = getSelectedFormat('fusion-format');
    const fusionName = sanitizeFileName(els.fusionNameInput.value.trim() || 'fusion');

    els.btnDownloadFusion.disabled = true;
    setButtonText(els.btnDownloadFusion, 'Préparation...');

    try {
        let blob = state.fusionBlob;
        let extension = 'wav';

        if (format === 'mp3') {
            showToast('Conversion MP3 en cours...', 'info');
            await new Promise(resolve => setTimeout(resolve, 50));
            blob = bufferToMP3(state.fusionBuffer);
            extension = 'mp3';
        }

        triggerDownload(blob, fusionName, extension);
    } catch (error) {
        console.error('Download fusion error:', error);
        showToast(getUserAudioErrorMessage(error), 'error');
    } finally {
        els.btnDownloadFusion.disabled = false;
        setButtonText(els.btnDownloadFusion, 'Télécharger');
    }
}

function triggerDownload(blob, name, extension) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${sanitizeFileName(name)}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Téléchargement démarré');
}

async function saveFusion() {
    if (!state.fusionResult || !state.fusionBlob) return;

    const fusionName = els.fusionNameInput.value.trim() || `${state.fusionResult.nameA} + ${state.fusionResult.nameB}`;

    const fusionItem = {
        id: generateId(),
        nom: sanitizeFileName(fusionName),
        type: 'fusion',
        format: 'wav',
        _blob: state.fusionBlob,
        size: state.fusionBlob.size,
        duration: state.fusionResult.duration || 0,
        dateCreation: new Date().toISOString(),
        loopStart: 0,
        loopEnd: 0
    };

    state.library.push(fusionItem);
    const saved = await saveLibrary();
    if (!saved) {
        state.library = state.library.filter(item => item.id !== fusionItem.id);
        return;
    }
    renderLibrary();
    populateFusionSelects();
    showToast('Fusion enregistrée !');
}

async function handleLibraryAction(event) {
    const emptyAction = event.target.closest('[data-empty-action]');
    if (emptyAction) {
        if (emptyAction.dataset.emptyAction === 'import') {
            els.audioInput.click();
        } else if (emptyAction.dataset.emptyAction === 'clear-search') {
            state.librarySearch = '';
            els.librarySearch.value = '';
            renderLibrary();
        }
        return;
    }

    const button = event.target.closest('[data-library-action]');
    if (!button) return;

    const id = button.dataset.id;
    const action = button.dataset.libraryAction;

    if (action === 'play') {
        await playLibraryAudio(id);
    } else if (action === 'download') {
        await downloadAudio(id);
    } else if (action === 'rename') {
        openRenameModal(id);
    } else if (action === 'delete') {
        deleteAudio(id);
    }
}

// ============================================
// Event Listeners
// ============================================
function initEventListeners() {
    els.navBtns.forEach(btn => {
        btn.setAttribute('aria-current', btn.classList.contains('active') ? 'page' : 'false');
        btn.addEventListener('click', () => switchScreen(btn.dataset.screen));
    });

    els.audioInput.addEventListener('change', (e) => {
        handleAudioImport(e.target.files[0]);
    });

    els.btnToggleLoop.addEventListener('click', toggleLoop);
    els.btnGoLoopStart.addEventListener('click', goToLoopStart);
    els.btnClearLoop.addEventListener('click', clearLoopSelection);
    els.btnLockLoop.addEventListener('click', toggleLoopSelectionLock);
    els.btnSaveAudio.addEventListener('click', saveCurrentAudio);

    [els.loopStart, els.loopEnd].forEach(input => {
        input.addEventListener('input', () => {
            if (state.loopSelectionLocked) return;
            input.value = input.value.replace(/[^0-9:]/g, '').slice(0, 5);
            applyLoopInputs({ showError: false });
        });
        input.addEventListener('blur', () => {
            if (state.loopSelectionLocked) return;
            let value = input.value.replace(/[^0-9:]/g, '');
            if (value && !value.includes(':')) {
                value = value.padStart(2, '0');
                input.value = `00:${value}`;
            }
            applyLoopInputs({ showError: false });
        });
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') input.blur();
        });
    });

    // Extract Loop
    els.btnExtractLoop.addEventListener('click', extractLoop);
    els.btnSaveExtract.addEventListener('click', saveExtractedLoop);
    els.btnCancelExport.addEventListener('click', cancelCurrentExport);
    els.librarySearch.addEventListener('input', (event) => {
        state.librarySearch = event.target.value;
        renderLibrary();
    });
    els.librarySort.addEventListener('change', (event) => {
        state.librarySort = event.target.value;
        renderLibrary();
    });
    els.waveformTrack.addEventListener('pointerdown', handleWaveformPointerDown);
    els.waveformTrack.addEventListener('pointermove', handleWaveformPointerMove);
    els.waveformTrack.addEventListener('pointerup', handleWaveformPointerUp);
    els.waveformTrack.addEventListener('pointercancel', handleWaveformPointerUp);
    els.waveformTrack.addEventListener('keydown', handleWaveformKeydown);
    window.addEventListener('resize', () => {
        renderWaveform();
        updateWaveformUI();
    });

    els.fusionSelectA.addEventListener('change', (e) => {
        state.fusionAudioA = e.target.value;
        updateFusionButton();
    });

    els.fusionSelectB.addEventListener('change', (e) => {
        state.fusionAudioB = e.target.value;
        updateFusionButton();
    });

    els.btnRemoveA.addEventListener('click', removeSelectionA);
    els.btnRemoveB.addEventListener('click', removeSelectionB);
    els.btnFusion.addEventListener('click', performFusion);
    els.btnDownloadFusion.addEventListener('click', downloadFusion);
    els.btnSaveFusion.addEventListener('click', saveFusion);

    els.btnCancelRename.addEventListener('click', closeRenameModal);
    els.btnConfirmRename.addEventListener('click', confirmRename);
    els.renameModal.querySelector('.modal-backdrop').addEventListener('click', closeRenameModal);
    els.libraryList.addEventListener('click', handleLibraryAction);

    els.renameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') confirmRename();
    });

    document.addEventListener('keydown', (e) => {
        keepFocusInRenameModal(e);
        if (e.key === 'Escape' && !els.renameModal.classList.contains('hidden')) {
            closeRenameModal();
        }
    });
}

// ============================================
// Initialize App
// ============================================
async function init() {
    initDOMElements();

    // Initialize IndexedDB
    useIndexedDB = await initIndexedDB();

    await loadLibrary();
    renderLibrary();
    setupAudioPlayer();
    initEventListeners();
    populateFusionSelects();
}

document.addEventListener('DOMContentLoaded', init);
