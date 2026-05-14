/* 量子码 v3.0 - 全前端方案 */
/* Telegraph 图床 + QRCode.js */

const VIEWER_BASE = 'https://k183f.github.io/qrcode-view/';
const HISTORY_KEY = 'quantum_qr_history';
const MAX_HISTORY = 20;

let selectedFile = null;
let currentQR = null;

// DOM
const $ = id => document.getElementById(id);
const uploadZone = $('uploadZone');
const fileInput = $('fileInput');
const previewArea = $('previewArea');
const previewImg = $('previewImg');
const fileName = $('fileName');
const fileSize = $('fileSize');
const uploadBtn = $('uploadBtn');
const clearBtn = $('clearBtn');
const progressBar = $('progressBar');
const progressFill = $('progressFill');
const progressText = $('progressText');
const resultSection = $('resultSection');
const qrCanvas = $('qrCanvas');
const downloadBtn = $('downloadBtn');
const copyBtn = $('copyBtn');
const testBtn = $('testBtn');
const historySection = $('historySection');
const historyList = $('historyList');
const clearHistoryBtn = $('clearHistoryBtn');

// Upload Zone Events
uploadZone.addEventListener('click', () => fileInput.click());

uploadZone.addEventListener('dragover', e => {
    e.preventDefault();
    uploadZone.classList.add('drag-over');
});

uploadZone.addEventListener('dragleave', () => {
    uploadZone.classList.remove('drag-over');
});

uploadZone.addEventListener('drop', e => {
    e.preventDefault();
    uploadZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
});

fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) handleFile(fileInput.files[0]);
});

// Button Events
uploadBtn.addEventListener('click', uploadImage);
clearBtn.addEventListener('click', clearPreview);
downloadBtn.addEventListener('click', downloadQR);
copyBtn.addEventListener('click', copyLink);
testBtn.addEventListener('click', testOpen);
clearHistoryBtn.addEventListener('click', () => {
    localStorage.removeItem(HISTORY_KEY);
    renderHistory();
});

function handleFile(file) {
    if (!file.type.startsWith('image/')) {
        return toast('请选择图片文件', 'error');
    }
    if (file.size > 5 * 1024 * 1024) {
        return toast('图片不能超过 5MB', 'error');
    }

    selectedFile = file;
    const reader = new FileReader();
    reader.onload = e => {
        previewImg.src = e.target.result;
        fileName.textContent = file.name;
        fileSize.textContent = formatSize(file.size);
        previewArea.style.display = 'block';
        uploadZone.style.display = 'none';
    };
    reader.readAsDataURL(file);
}

function clearPreview() {
    selectedFile = null;
    fileInput.value = '';
    previewArea.style.display = 'none';
    uploadZone.style.display = 'block';
}

async function uploadImage() {
    if (!selectedFile) return;

    const btn = uploadBtn;
    btn.disabled = true;
    btn.innerHTML = '<span class="btn-icon">⟳</span> 上传中...';
    progressBar.style.display = 'block';
    progressFill.style.width = '20%';
    progressText.textContent = '正在上传图片...';

    try {
        // Step 1: Upload to Telegraph
        const formData = new FormData();
        formData.append('file', selectedFile);

        progressFill.style.width = '40%';
        const uploadRes = await fetch('https://telegra.ph/upload', {
            method: 'POST',
            body: formData
        });

        if (!uploadRes.ok) throw new Error('上传失败');

        const uploadData = await uploadRes.json();

        if (!uploadData || uploadData.error || !uploadData[0]?.src) {
            throw new Error(uploadData?.error || '图片上传失败');
        }

        const imageSrc = 'https://telegra.ph' + uploadData[0].src;
        progressFill.style.width = '70%';
        progressText.textContent = '正在生成二维码...';

        // Step 2: Generate QR
        const viewUrl = VIEWER_BASE + '?src=' + encodeURIComponent(imageSrc);

        await new Promise((resolve, reject) => {
            QRCode.toCanvas(qrCanvas, viewUrl, {
                width: 280,
                margin: 2,
                errorCorrectionLevel: 'M',
                color: { dark: '#000000', light: '#ffffff' }
            }, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        currentQR = { url: viewUrl, imageSrc };
        progressFill.style.width = '100%';
        progressText.textContent = '完成!';

        // Show result
        resultSection.style.display = 'block';
        setTimeout(() => {
            resultSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);

        // Save to history
        saveHistory({
            imageSrc,
            viewUrl,
            thumb: previewImg.src,
            time: Date.now()
        });

        toast('✅ 二维码生成成功!', 'success');

    } catch (err) {
        console.error(err);
        toast('❌ ' + err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<span class="btn-icon">▲</span> 上传并生成二维码';
        setTimeout(() => {
            progressBar.style.display = 'none';
            progressFill.style.width = '0%';
        }, 600);
    }
}

function downloadQR() {
    if (!currentQR) return;
    const link = document.createElement('a');
    link.download = 'quantum-qr-' + Date.now() + '.png';
    link.href = qrCanvas.toDataURL('image/png');
    link.click();
    toast('二维码已下载', 'info');
}

async function copyLink() {
    if (!currentQR) return;
    try {
        await navigator.clipboard.writeText(currentQR.url);
        toast('链接已复制', 'info');
    } catch {
        // Fallback
        const ta = document.createElement('textarea');
        ta.value = currentQR.url;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        toast('链接已复制', 'info');
    }
}

function testOpen() {
    if (currentQR) window.open(currentQR.url, '_blank');
}

// History
function saveHistory(item) {
    const history = getHistory();
    history.unshift(item);
    if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    renderHistory();
}

function getHistory() {
    try {
        return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
    } catch { return []; }
}

function renderHistory() {
    const history = getHistory();
    if (!history.length) {
        historySection.style.display = 'none';
        return;
    }

    historySection.style.display = 'block';
    historyList.innerHTML = history.map(item => `
        <div class="history-item" onclick="window.open('${item.viewUrl}','_blank')" title="${item.viewUrl}">
            <img src="${item.thumb}" alt="历史图片" loading="lazy">
            <div class="history-item-time">${timeAgo(item.time)}</div>
        </div>
    `).join('');
}

// Helpers
function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
}

function timeAgo(ts) {
    const diff = Date.now() - ts;
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
    if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前';
    return Math.floor(diff / 86400000) + '天前';
}

function toast(msg, type = 'info') {
    const el = document.createElement('div');
    el.className = 'toast toast-' + type;
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => {
        el.style.opacity = '0';
        el.style.transition = 'opacity .3s';
        setTimeout(() => el.remove(), 300);
    }, 2500);
}

// Init
renderHistory();
