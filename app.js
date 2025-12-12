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
const DB_VERSION = 1;
const STORE_NAME = 'audios';

let db = null;
let useIndexedDB = false;

const state = {
    currentAudio: null,
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
    extractedBlob: null,
    extractedDataURL: null
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
        loopStart: document.getElementById('loop-start'),
        loopEnd: document.getElementById('loop-end'),
        btnToggleLoop: document.getElementById('btn-toggle-loop'),
        btnSaveAudio: document.getElementById('btn-save-audio'),
        extractCard: document.getElementById('extract-card'),
        extractName: document.getElementById('extract-name'),
        btnExtractLoop: document.getElementById('btn-extract-loop'),
        btnSaveExtract: document.getElementById('btn-save-extract'),
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
        btnConfirmRename: document.getElementById('btn-confirm-rename')
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

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 90px;
        left: 50%;
        transform: translateX(-50%);
        background: ${type === 'success' ? '#C8FF00' : '#FF3B3B'};
        color: #0B0B0B;
        padding: 12px 24px;
        border-radius: 8px;
        font-weight: 600;
        font-size: 0.85rem;
        z-index: 1000;
        animation: toastIn 0.3s ease;
        max-width: 90%;
        text-align: center;
    `;
    document.body.appendChild(toast);
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
        };
    });
}

async function saveToIndexedDB(audioItem) {
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

async function loadFromIndexedDB() {
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

async function deleteFromIndexedDB(id) {
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
async function loadLibrary() {
    try {
        // Try IndexedDB first
        if (useIndexedDB && db) {
            const items = await loadFromIndexedDB();
            if (items.length > 0) {
                state.library = items;
                return;
            }
        }

        // Fallback to localStorage
        const data = localStorage.getItem(STORAGE_KEY);
        state.library = data ? JSON.parse(data) : [];

        // Migrate to IndexedDB if available
        if (useIndexedDB && db && state.library.length > 0) {
            for (const item of state.library) {
                await saveToIndexedDB(item);
            }
        }
    } catch (e) {
        console.error('Error loading library:', e);
        state.library = [];
    }
}

async function saveLibrary() {
    try {
        if (useIndexedDB && db) {
            // Save each item to IndexedDB
            for (const item of state.library) {
                await saveToIndexedDB(item);
            }
            // Also save metadata to localStorage (without dataURL for backup)
            const metadata = state.library.map(({ dataURL, ...rest }) => rest);
            try {
                localStorage.setItem(STORAGE_KEY + '_meta', JSON.stringify(metadata));
            } catch (e) { }
        } else {
            // Try localStorage
            const jsonData = JSON.stringify(state.library);
            try {
                localStorage.setItem(STORAGE_KEY, jsonData);
            } catch (quotaError) {
                // Quota exceeded, try to use IndexedDB
                if (db) {
                    useIndexedDB = true;
                    for (const item of state.library) {
                        await saveToIndexedDB(item);
                    }
                    showToast('Stockage optimisé activé', 'success');
                } else {
                    showToast('Espace de stockage insuffisant', 'error');
                }
            }
        }
    } catch (e) {
        console.error('Error saving library:', e);
        showToast('Erreur de sauvegarde', 'error');
    }
}

async function deleteFromStorage(id) {
    if (useIndexedDB && db) {
        await deleteFromIndexedDB(id);
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

    // Check file size (warn if > 5MB)
    if (file.size > 5 * 1024 * 1024) {
        showToast('Fichier volumineux - stockage peut être limité', 'error');
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        state.currentAudio = e.target.result;
        state.currentAudioName = file.name.replace(/\.[^/.]+$/, '');

        els.fileName.textContent = file.name;
        els.fileName.classList.add('active');
        els.audioPlayer.src = state.currentAudio;
        els.playerContainer.classList.remove('hidden');
        els.btnToggleLoop.disabled = false;
        els.btnSaveAudio.disabled = false;

        state.loopEnabled = false;
        els.loopStart.value = '00:00';
        updateLoopButtonState();
    };
    reader.onerror = () => {
        showToast('Erreur de lecture du fichier', 'error');
    };
    reader.readAsDataURL(file);
}

// ============================================
// Audio Player & Loop
// ============================================
function setupAudioPlayer() {
    els.audioPlayer.addEventListener('loadedmetadata', () => {
        const duration = els.audioPlayer.duration;
        els.audioDuration.textContent = `Durée: ${formatTime(duration)}`;
        els.loopEnd.value = formatTime(duration);
        state.loopEnd = duration;
    });

    els.audioPlayer.addEventListener('timeupdate', () => {
        if (!state.loopEnabled) return;
        if (els.audioPlayer.currentTime >= state.loopEnd) {
            els.audioPlayer.currentTime = state.loopStart;
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
    state.loopStart = parseTime(els.loopStart.value || '00:00');
    state.loopEnd = parseTime(els.loopEnd.value) || els.audioPlayer.duration;

    if (state.loopStart >= state.loopEnd) {
        showToast('Le début doit être avant la fin', 'error');
        return;
    }

    if (state.loopEnd > els.audioPlayer.duration) {
        state.loopEnd = els.audioPlayer.duration;
        els.loopEnd.value = formatTime(state.loopEnd);
    }

    state.loopEnabled = !state.loopEnabled;
    updateLoopButtonState();

    if (state.loopEnabled) {
        els.audioPlayer.currentTime = state.loopStart;
        els.audioPlayer.play();
    }
}

function updateLoopButtonState() {
    const btnSpan = els.btnToggleLoop.querySelector('span');
    if (state.loopEnabled) {
        els.btnToggleLoop.classList.add('active');
        btnSpan.textContent = 'Désactiver';
    } else {
        els.btnToggleLoop.classList.remove('active');
        btnSpan.textContent = 'Activer Loop';
    }

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
}

function showExtractCard() {
    state.loopStart = parseTime(els.loopStart.value || '00:00');
    state.loopEnd = parseTime(els.loopEnd.value) || els.audioPlayer.duration;

    if (state.loopStart >= state.loopEnd || !state.currentAudio) {
        els.extractCard.classList.add('hidden');
        return;
    }

    els.extractCard.classList.remove('hidden');
    els.btnExtractLoop.disabled = false;
    els.btnSaveExtract.disabled = false;
    const defaultName = `${state.currentAudioName || 'Audio'} (${formatTime(state.loopStart)}-${formatTime(state.loopEnd)})`;
    els.extractName.value = defaultName;
}

async function extractLoop() {
    if (!state.currentAudio) return;

    const startTime = parseTime(els.loopStart.value || '00:00');
    const endTime = parseTime(els.loopEnd.value) || els.audioPlayer.duration;

    if (startTime >= endTime) {
        showToast('Le début doit être avant la fin', 'error');
        return;
    }

    els.btnExtractLoop.disabled = true;
    els.btnExtractLoop.querySelector('span').textContent = 'Extraction...';

    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const buffer = await fetchAudioBuffer(audioContext, state.currentAudio);

        const sampleRate = buffer.sampleRate;
        const startSample = Math.floor(startTime * sampleRate);
        const endSample = Math.min(Math.floor(endTime * sampleRate), buffer.length);
        const extractedLength = endSample - startSample;

        if (extractedLength <= 0) {
            showToast('Portion invalide', 'error');
            return;
        }

        const extractedBuffer = audioContext.createBuffer(
            buffer.numberOfChannels,
            extractedLength,
            sampleRate
        );

        for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
            const sourceData = buffer.getChannelData(channel);
            const targetData = extractedBuffer.getChannelData(channel);
            for (let i = 0; i < extractedLength; i++) {
                targetData[i] = sourceData[startSample + i];
            }
        }

        const format = document.querySelector('input[name="extract-format"]:checked').value;
        let blob, extension;

        if (format === 'mp3') {
            blob = bufferToMP3(extractedBuffer);
            extension = 'mp3';
        } else {
            blob = bufferToWave(extractedBuffer, extractedLength);
            extension = 'wav';
        }

        state.extractedBlob = blob;

        const reader = new FileReader();
        reader.onload = () => {
            state.extractedDataURL = reader.result;
        };
        reader.readAsDataURL(blob);

        // Download immediately
        const extractName = els.extractName.value.trim() || 'loop_extract';
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${extractName}.${extension}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        audioContext.close();
        showToast(`Loop extrait et téléchargé (${extension.toUpperCase()}) !`);

    } catch (error) {
        console.error('Extract error:', error);
        showToast('Erreur lors de l\'extraction', 'error');
    }

    els.btnExtractLoop.disabled = false;
    els.btnExtractLoop.querySelector('span').textContent = 'Extraire & Télécharger';
}

async function saveExtractedLoop() {
    if (!state.currentAudio) return;

    const startTime = parseTime(els.loopStart.value || '00:00');
    const endTime = parseTime(els.loopEnd.value) || els.audioPlayer.duration;

    if (startTime >= endTime) {
        showToast('Le début doit être avant la fin', 'error');
        return;
    }

    els.btnSaveExtract.disabled = true;

    try {
        // If we don't have extracted data, extract it now
        if (!state.extractedDataURL) {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const buffer = await fetchAudioBuffer(audioContext, state.currentAudio);

            const sampleRate = buffer.sampleRate;
            const startSample = Math.floor(startTime * sampleRate);
            const endSample = Math.min(Math.floor(endTime * sampleRate), buffer.length);
            const extractedLength = endSample - startSample;

            const extractedBuffer = audioContext.createBuffer(
                buffer.numberOfChannels,
                extractedLength,
                sampleRate
            );

            for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
                const sourceData = buffer.getChannelData(channel);
                const targetData = extractedBuffer.getChannelData(channel);
                for (let i = 0; i < extractedLength; i++) {
                    targetData[i] = sourceData[startSample + i];
                }
            }

            const wavBlob = bufferToWave(extractedBuffer, extractedLength);
            const reader = new FileReader();

            await new Promise((resolve) => {
                reader.onload = () => {
                    state.extractedDataURL = reader.result;
                    resolve();
                };
                reader.readAsDataURL(wavBlob);
            });

            audioContext.close();
        }

        const extractName = els.extractName.value.trim() || `${state.currentAudioName} (loop)`;

        const audioItem = {
            id: generateId(),
            nom: extractName,
            type: 'import',
            dataURL: state.extractedDataURL,
            dateCreation: new Date().toISOString(),
            loopStart: 0,
            loopEnd: 0
        };

        state.library.push(audioItem);
        await saveLibrary();
        renderLibrary();
        populateFusionSelects();

        showToast('Loop enregistré dans la bibliothèque !');
        state.extractedDataURL = null;
        state.extractedBlob = null;

    } catch (error) {
        console.error('Save extract error:', error);
        showToast('Erreur lors de l\'enregistrement', 'error');
    }

    els.btnSaveExtract.disabled = false;
}

// ============================================
// Library Management
// ============================================
async function saveCurrentAudio() {
    if (!state.currentAudio) return;

    const audioItem = {
        id: generateId(),
        nom: state.currentAudioName || 'Audio sans nom',
        type: 'import',
        dataURL: state.currentAudio,
        dateCreation: new Date().toISOString(),
        loopStart: parseTime(els.loopStart.value || '00:00'),
        loopEnd: parseTime(els.loopEnd.value || '00:00')
    };

    state.library.push(audioItem);
    await saveLibrary();
    renderLibrary();
    showToast('Audio enregistré !');
}

function renderLibrary() {
    els.libraryCount.textContent = `${state.library.length} audio${state.library.length !== 1 ? 's' : ''}`;

    if (state.library.length === 0) {
        els.libraryList.innerHTML = '<p class="empty-state">Aucun audio enregistré</p>';
        return;
    }

    els.libraryList.innerHTML = state.library.map(item => `
        <div class="library-item" data-id="${item.id}">
            <div class="library-item-info">
                <div class="library-item-name">${escapeHtml(item.nom)}</div>
                <div class="library-item-meta">
                    <span class="badge ${item.type}">${item.type === 'import' ? 'Import' : 'Fusion'}</span>
                </div>
            </div>
            <div class="library-item-actions">
                <button class="btn btn-neutral btn-icon" onclick="playLibraryAudio('${item.id}')" title="Écouter">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                </button>
                <button class="btn btn-neutral btn-icon" onclick="openRenameModal('${item.id}')" title="Renommer">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button class="btn btn-delete btn-icon" onclick="deleteAudio('${item.id}')" title="Supprimer">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
            </div>
        </div>
    `).join('');
}

function playLibraryAudio(id) {
    const item = state.library.find(a => a.id === id);
    if (!item) return;

    state.currentAudio = item.dataURL;
    state.currentAudioName = item.nom;
    els.audioPlayer.src = item.dataURL;
    els.playerContainer.classList.remove('hidden');
    els.fileName.textContent = item.nom;
    els.fileName.classList.add('active');
    els.btnToggleLoop.disabled = false;
    els.btnSaveAudio.disabled = false;

    if (item.loopStart) els.loopStart.value = formatTime(item.loopStart);
    if (item.loopEnd) els.loopEnd.value = formatTime(item.loopEnd);

    state.loopEnabled = false;
    updateLoopButtonState();
    els.audioPlayer.play();
}

function downloadAudio(id) {
    const item = state.library.find(a => a.id === id);
    if (!item || !item.dataURL) return;

    const link = document.createElement('a');
    link.href = item.dataURL;
    link.download = `${item.nom}.wav`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Téléchargement démarré');
}

async function deleteAudio(id) {
    if (!confirm('Supprimer cet audio ?')) return;

    state.library = state.library.filter(a => a.id !== id);
    await deleteFromStorage(id);
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
    els.renameInput.value = item.nom;
    els.renameModal.classList.remove('hidden');
    setTimeout(() => els.renameInput.focus(), 100);
}

function closeRenameModal() {
    els.renameModal.classList.add('hidden');
    state.renameTarget = null;
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
        `<option value="${item.id}">${escapeHtml(item.nom)}</option>`
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
    els.btnFusion.disabled = !(hasA && hasB);
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

    const audioA = state.library.find(a => a.id === idA);
    const audioB = state.library.find(a => a.id === idB);

    if (!audioA || !audioB) return;

    els.btnFusion.disabled = true;
    els.btnFusion.querySelector('span').textContent = 'Fusion...';

    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();

        const [bufferA, bufferB] = await Promise.all([
            fetchAudioBuffer(audioContext, audioA.dataURL),
            fetchAudioBuffer(audioContext, audioB.dataURL)
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
        state.fusionBuffer = mergedBuffer; // Save for MP3 conversion

        const reader = new FileReader();
        reader.onload = () => {
            state.fusionResult = {
                dataURL: reader.result,
                nameA: audioA.nom,
                nameB: audioB.nom
            };

            els.fusionPlayer.src = reader.result;
            els.fusionNameInput.value = `${audioA.nom} + ${audioB.nom}`;
            els.fusionResultCard.classList.remove('hidden');
            showToast('Fusion terminée !');
        };

        reader.readAsDataURL(wavBlob);
        audioContext.close();

    } catch (error) {
        console.error('Fusion error:', error);
        showToast('Erreur lors de la fusion', 'error');
    }

    els.btnFusion.disabled = false;
    els.btnFusion.querySelector('span').textContent = 'Fusionner A + B';
}

async function fetchAudioBuffer(audioContext, dataURL) {
    const response = await fetch(dataURL);
    const arrayBuffer = await response.arrayBuffer();
    return audioContext.decodeAudioData(arrayBuffer);
}

function bufferToMP3(buffer) {
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

function downloadFusion() {
    if (!state.fusionBlob || !state.fusionBuffer) return;

    const format = document.querySelector('input[name="fusion-format"]:checked').value;
    const fusionName = els.fusionNameInput.value.trim() || 'fusion';

    let blob, extension;
    if (format === 'mp3') {
        showToast('Conversion MP3 en cours...', 'info');
        // Small timeout to let UI update
        setTimeout(() => {
            blob = bufferToMP3(state.fusionBuffer);
            extension = 'mp3';
            triggerDownload(blob, fusionName, extension);
        }, 50);
    } else {
        blob = state.fusionBlob;
        extension = 'wav';
        triggerDownload(blob, fusionName, extension);
    }
}

function triggerDownload(blob, name, extension) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${name}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Téléchargement démarré');
}

async function saveFusion() {
    if (!state.fusionResult) return;

    const fusionName = els.fusionNameInput.value.trim() || `${state.fusionResult.nameA} + ${state.fusionResult.nameB}`;

    const fusionItem = {
        id: generateId(),
        nom: fusionName,
        type: 'fusion',
        dataURL: state.fusionResult.dataURL,
        dateCreation: new Date().toISOString(),
        loopStart: 0,
        loopEnd: 0
    };

    state.library.push(fusionItem);
    await saveLibrary();
    renderLibrary();
    populateFusionSelects();
    showToast('Fusion enregistrée !');
}

// ============================================
// Event Listeners
// ============================================
function initEventListeners() {
    els.navBtns.forEach(btn => {
        btn.addEventListener('click', () => switchScreen(btn.dataset.screen));
    });

    els.audioInput.addEventListener('change', (e) => {
        handleAudioImport(e.target.files[0]);
    });

    els.btnToggleLoop.addEventListener('click', toggleLoop);
    els.btnSaveAudio.addEventListener('click', saveCurrentAudio);

    [els.loopStart, els.loopEnd].forEach(input => {
        input.addEventListener('blur', () => {
            let value = input.value.replace(/[^0-9:]/g, '');
            if (value && !value.includes(':')) {
                value = value.padStart(2, '0');
                input.value = `00:${value}`;
            }
            showExtractCard();
        });
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') input.blur();
        });
    });

    // Extract Loop
    els.btnExtractLoop.addEventListener('click', extractLoop);
    els.btnSaveExtract.addEventListener('click', saveExtractedLoop);

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

    els.renameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') confirmRename();
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
