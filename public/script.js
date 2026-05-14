// 量子码 - 后台管理脚本 v3.0

const API = '/api';
const MAX_SIZE = 10 * 1024 * 1024;

let selectedFile = null;
let qrDataURL = null;
let qrViewUrl = null;

const el = {
    fileInput:     document.getElementById('file-input'),
    uploadZone:    document.getElementById('upload-zone'),
    previewWrap:   document.getElementById('preview-wrap'),
    previewImg:    document.getElementById('preview-img'),
    previewRemove: document.getElementById('preview-remove'),
    submitBtn:     document.getElementById('submit-btn'),
    submitText:    document.getElementById('submit-text'),
    progressBar:   document.getElementById('progress-bar'),
    progressFill:  document.getElementById('progress-fill'),
    qrPlaceholder: document.getElementById('qr-placeholder'),
    qrBox:         document.getElementById('qr-box'),
    qrImg:         document.getElementById('qr-img'),
    qrLink:        document.getElementById('qr-link'),
    qrDownload:    document.getElementById('qr-download'),
    qrCopy:        document.getElementById('qr-copy'),
    qrTest:        document.getElementById('qr-test'),
    uploadList:    document.getElementById('upload-list'),
    listCount:     document.getElementById('list-count'),
    sizeOpts:      document.querySelectorAll('.size-opt')
};

let selectedSize = 300;

function init() {
    bindEvents();
    loadList();
}

function bindEvents() {
    el.uploadZone.addEventListener('click', () => el.fileInput.click());
    el.fileInput.addEventListener('change', e => { if (e.target.files[0]) pickFile(e.target.files[0]); });

    el.uploadZone.addEventListener('dragover', e => { e.preventDefault(); el.uploadZone.classList.add('dragover'); });
    el.uploadZone.addEventListener('dragleave', e => { e.preventDefault(); el.uploadZone.classList.remove('dragover'); });
    el.uploadZone.addEventListener('drop', e => {
        e.preventDefault(); el.uploadZone.classList.remove('dragover');
        if (e.dataTransfer.files[0]) pickFile(e.dataTransfer.files[0]);
    });

    el.previewRemove.addEventListener('click', clearPreview);
    el.submitBtn.addEventListener('click', handleSubmit);

    el.sizeOpts.forEach(opt => {
        opt.addEventListener('click', () => {
            el.sizeOpts.forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
            selectedSize = parseInt(opt.dataset.size);
        });
    });

    el.qrDownload.addEventListener('click', downloadQR);
    el.qrCopy.addEventListener('click', copyLink);
    el.qrTest.addEventListener('click', () => { if (qrViewUrl) window.open(qrViewUrl, '_blank'); });
}

function pickFile(file) {
    if (!file.type.startsWith('image/')) { toast('请选择图片文件', 'error'); return; }
    if (file.size > MAX_SIZE) { toast('文件不能超过 10MB', 'error'); return; }

    selectedFile = file;
    const reader = new FileReader();
    reader.onload = e => {
        el.previewImg.src = e.target.result;
        el.uploadZone.style.display = 'none';
        el.previewWrap.style.display = 'block';
        el.submitBtn.disabled = false;
    };
    reader.readAsDataURL(file);
}

function clearPreview() {
    selectedFile = null;
    el.fileInput.value = '';
    el.uploadZone.style.display = '';
    el.previewWrap.style.display = 'none';
    el.submitBtn.disabled = true;
}

async function handleSubmit() {
    if (!selectedFile) return;

    el.submitBtn.disabled = true;
    el.submitText.textContent = '上传中...';
    el.progressBar.style.display = 'block';
    el.progressFill.style.width = '30%';

    try {
        const fd = new FormData();
        fd.append('image', selectedFile);

        const uploadRes = await fetch(`${API}/upload`, { method: 'POST', body: fd });
        if (!uploadRes.ok) throw new Error('上传失败');
        const data = await uploadRes.json();

        qrViewUrl = data.viewUrl;
        el.progressFill.style.width = '70%';
        el.submitText.textContent = '生成二维码...';

        const qrRes = await fetch(`${API}/generate-qr`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: qrViewUrl, size: selectedSize })
        });
        if (!qrRes.ok) throw new Error('生成二维码失败');
        const qrData = await qrRes.json();

        el.progressFill.style.width = '100%';
        qrDataURL = qrData.qrCode;

        el.qrPlaceholder.style.display = 'none';
        el.qrBox.style.display = 'flex';
        el.qrImg.src = qrDataURL;
        el.qrLink.textContent = qrViewUrl;

        toast('✅ 上传成功，二维码已生成', 'success');
        clearPreview();
        loadList();

    } catch (err) {
        toast(err.message, 'error');
    } finally {
        el.submitBtn.disabled = false;
        el.submitText.textContent = '上传并生成二维码';
        setTimeout(() => {
            el.progressBar.style.display = 'none';
            el.progressFill.style.width = '0%';
        }, 800);
    }
}

function downloadQR() {
    if (!qrDataURL) return;
    const a = document.createElement('a');
    a.href = qrDataURL;
    a.download = `qrcode-${Date.now()}.png`;
    a.click();
}

async function copyLink() {
    if (!qrViewUrl) return;
    try { await navigator.clipboard.writeText(qrViewUrl); toast('链接已复制', 'success'); }
    catch { toast('复制失败', 'error'); }
}

async function loadList() {
    try {
        const res = await fetch(`${API}/images`);
        const data = await res.json();
        const images = data.images || [];
        el.listCount.textContent = images.length;

        if (!images.length) {
            el.uploadList.innerHTML = '<div style="color:var(--text-dim); font-size:0.85rem; text-align:center; padding:24px 0;">暂无图片</div>';
            return;
        }

        el.uploadList.innerHTML = images.slice().reverse().map(img => `
            <div class="upload-item">
                <img src="${img.imageUrl}" alt="" class="upload-item-thumb">
                <div class="upload-item-info">
                    <div class="upload-item-name" title="${img.viewUrl}">${img.filename}</div>
                    <div class="upload-item-meta">
                        <span>${fmtSize(img.size)}</span>
                        <a href="${img.viewUrl}" target="_blank" class="upload-item-link">查看展示页 ↗</a>
                    </div>
                </div>
                <button class="btn btn-danger btn-sm" style="padding:4px 10px; font-size:0.65rem;" onclick="delImage('${img.filename}')">删除</button>
            </div>
        `).join('');
    } catch (err) {
        console.error('loadList failed:', err);
    }
}

async function delImage(filename) {
    try {
        const res = await fetch(`${API}/image/${filename}`, { method: 'DELETE' });
        if (res.ok) { toast('已删除', 'success'); loadList(); }
        else toast('删除失败', 'error');
    } catch { toast('删除失败', 'error'); }
}

function fmtSize(b) {
    if (b < 1024) return b + ' B';
    if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
    return (b / 1048576).toFixed(1) + ' MB';
}

function toast(msg, type = '') {
    document.querySelectorAll('.toast').forEach(t => t.remove());
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => {
        t.style.animation = 'slideOutRight 0.3s ease forwards';
        setTimeout(() => t.remove(), 300);
    }, 3000);
}

document.addEventListener('DOMContentLoaded', init);
