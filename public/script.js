/* 量子码 v3.0 - 前端（调用后端API） */

let selectedFile = null;
let currentResult = null;

const $ = id => document.getElementById(id);
const uploadZone = $('uploadZone');
const fileInput = $('fileInput');
const previewArea = $('previewArea');
const uploadBtn = $('uploadBtn');
const clearBtn = $('clearBtn');
const progressBar = $('progressBar');
const progressFill = $('progressFill');
const resultSection = $('resultSection');
const qrImg = $('qrImg');

// Upload Zone
uploadZone.addEventListener('click', () => fileInput.click());
uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('drag-over'); });
uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
uploadZone.addEventListener('drop', e => {
    e.preventDefault(); uploadZone.classList.remove('drag-over');
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
});
fileInput.addEventListener('change', () => { if (fileInput.files[0]) handleFile(fileInput.files[0]); });

// Buttons
uploadBtn.addEventListener('click', doUpload);
clearBtn.addEventListener('click', clearPreview);
$('downloadBtn').addEventListener('click', downloadQR);
$('copyBtn').addEventListener('click', copyLink);
$('testBtn').addEventListener('click', () => { if (currentResult) window.open(currentResult.viewUrl, '_blank'); });

function handleFile(file) {
    if (!file.type.startsWith('image/')) return toast('请选择图片文件', 'err');
    if (file.size > 10 * 1024 * 1024) return toast('图片不能超过 10MB', 'err');

    selectedFile = file;
    const reader = new FileReader();
    reader.onload = e => {
        $('previewImg').src = e.target.result;
        $('fileName').textContent = file.name;
        $('fileSize').textContent = fmtSize(file.size);
        previewArea.style.display = 'block';
        uploadZone.style.display = 'none';
    };
    reader.readAsDataURL(file);
}

function clearPreview() {
    selectedFile = null; fileInput.value = '';
    previewArea.style.display = 'none';
    uploadZone.style.display = 'block';
}

async function doUpload() {
    if (!selectedFile) return;

    uploadBtn.disabled = true;
    uploadBtn.innerHTML = '<span class="btn-icon">⟳</span> 上传中...';
    progressBar.style.display = 'block';
    progressFill.style.width = '30%';
    $('progressText').textContent = '正在上传...';

    try {
        const fd = new FormData();
        fd.append('image', selectedFile);

        progressFill.style.width = '60%';

        const res = await fetch('/api/upload', { method: 'POST', body: fd });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || '上传失败');

        progressFill.style.width = '100%';
        $('progressText').textContent = '完成!';

        currentResult = data;
        qrImg.src = data.qrCode;
        resultSection.style.display = 'block';

        setTimeout(() => resultSection.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
        toast('✅ 二维码生成成功', 'ok');

    } catch (err) {
        toast('❌ ' + err.message, 'err');
    } finally {
        uploadBtn.disabled = false;
        uploadBtn.innerHTML = '<span class="btn-icon">▲</span> 上传并生成二维码';
        setTimeout(() => { progressBar.style.display = 'none'; progressFill.style.width = '0%'; }, 500);
    }
}

function downloadQR() {
    if (!currentResult) return;
    const a = document.createElement('a');
    a.download = 'quantum-qr.png';
    a.href = currentResult.qrCode;
    a.click();
    toast('已下载', 'info');
}

async function copyLink() {
    if (!currentResult) return;
    try { await navigator.clipboard.writeText(currentResult.viewUrl); }
    catch { /* fallback */ }
    toast('链接已复制', 'info');
}

function fmtSize(b) {
    if (b < 1024) return b + ' B';
    if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
    return (b / 1048576).toFixed(1) + ' MB';
}

function toast(msg, type) {
    const el = document.createElement('div');
    el.className = 'toast toast-' + type;
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(() => el.remove(), 300); }, 2500);
}
