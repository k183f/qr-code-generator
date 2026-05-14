// 量子码 - 二维码图片分享 JavaScript

const CONFIG = {
    API_BASE: '/api',
    MAX_FILE_SIZE: 10 * 1024 * 1024 // 10MB
};

const state = {
    selectedSize: 300,
    selectedErrorLevel: 'M',
    currentImageUrl: null,
    currentQRCode: null,
    uploadedFile: null
};

const elements = {
    fileInput: document.getElementById('file-input'),
    uploadArea: document.getElementById('upload-area'),
    previewContainer: document.getElementById('preview-container'),
    imagePreview: document.getElementById('image-preview'),
    removeBtn: document.getElementById('remove-btn'),
    generateBtn: document.getElementById('generate-btn'),
    progressBar: document.getElementById('progress-bar'),
    progressFill: document.getElementById('progress-fill'),
    qrPlaceholder: document.getElementById('qr-placeholder'),
    qrResult: document.getElementById('qr-result'),
    qrImage: document.getElementById('qr-image'),
    qrUrl: document.getElementById('qr-url'),
    actions: document.getElementById('actions'),
    downloadBtn: document.getElementById('download-btn'),
    copyBtn: document.getElementById('copy-btn'),
    testBtn: document.getElementById('test-btn'),
    sizeBtns: document.querySelectorAll('.size-btn')
};

function init() {
    bindEvents();
    console.log('🚀 量子码图片分享已启动');
}

function bindEvents() {
    // 上传区域点击
    elements.uploadArea.addEventListener('click', () => {
        elements.fileInput.click();
    });
    
    // 文件选择
    elements.fileInput.addEventListener('change', handleFileSelect);
    
    // 拖拽上传
    elements.uploadArea.addEventListener('dragover', handleDragOver);
    elements.uploadArea.addEventListener('dragleave', handleDragLeave);
    elements.uploadArea.addEventListener('drop', handleDrop);
    
    // 移除图片
    elements.removeBtn.addEventListener('click', handleRemoveImage);
    
    // 生成按钮
    elements.generateBtn.addEventListener('click', handleGenerate);
    
    // 尺寸选择
    elements.sizeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            elements.sizeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.selectedSize = parseInt(btn.dataset.size);
        });
    });
    
    // 操作按钮
    elements.downloadBtn.addEventListener('click', handleDownload);
    elements.copyBtn.addEventListener('click', handleCopy);
    elements.testBtn.addEventListener('click', handleTest);
}

function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    elements.uploadArea.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    elements.uploadArea.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    elements.uploadArea.classList.remove('drag-over');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        handleFile(file);
    }
}

function handleFile(file) {
    // 验证文件类型
    if (!file.type.startsWith('image/')) {
        showNotification('请选择图片文件', 'error');
        return;
    }
    
    // 验证文件大小
    if (file.size > CONFIG.MAX_FILE_SIZE) {
        showNotification('文件大小不能超过10MB', 'error');
        return;
    }
    
    state.uploadedFile = file;
    
    // 显示预览
    const reader = new FileReader();
    reader.onload = (e) => {
        elements.imagePreview.src = e.target.result;
        elements.uploadArea.style.display = 'none';
        elements.previewContainer.style.display = 'block';
        elements.generateBtn.disabled = false;
    };
    reader.readAsDataURL(file);
}

function handleRemoveImage() {
    state.uploadedFile = null;
    elements.fileInput.value = '';
    elements.uploadArea.style.display = 'block';
    elements.previewContainer.style.display = 'none';
    elements.generateBtn.disabled = true;
    
    // 重置二维码显示
    elements.qrPlaceholder.classList.remove('hidden');
    elements.qrResult.classList.add('hidden');
    elements.actions.style.display = 'none';
}

async function handleGenerate() {
    if (!state.uploadedFile) {
        showNotification('请先上传图片', 'error');
        return;
    }
    
    elements.generateBtn.disabled = true;
    elements.generateBtn.querySelector('.btn-text').textContent = '上传中...';
    elements.progressBar.style.display = 'block';
    
    try {
        // 上传图片
        const formData = new FormData();
        formData.append('image', state.uploadedFile);
        
        const uploadResponse = await fetch(`${CONFIG.API_BASE}/upload`, {
            method: 'POST',
            body: formData
        });
        
        if (!uploadResponse.ok) {
            throw new Error('上传失败');
        }
        
        const uploadData = await uploadResponse.json();
        state.currentImageUrl = uploadData.imageUrl;
        
        elements.progressFill.style.width = '100%';
        
        // 生成二维码
        elements.generateBtn.querySelector('.btn-text').textContent = '生成二维码...';
        
        const qrResponse = await fetch(`${CONFIG.API_BASE}/generate-qr`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                url: state.currentImageUrl,
                size: state.selectedSize
            })
        });
        
        if (!qrResponse.ok) {
            throw new Error('生成二维码失败');
        }
        
        const qrData = await qrResponse.json();
        
        // 显示二维码
        displayQRCode(qrData);
        
    } catch (error) {
        console.error('操作失败:', error);
        showNotification(error.message, 'error');
    } finally {
        elements.generateBtn.disabled = false;
        elements.generateBtn.querySelector('.btn-text').textContent = '上传并生成二维码';
        setTimeout(() => {
            elements.progressBar.style.display = 'none';
            elements.progressFill.style.width = '0%';
        }, 1000);
    }
}

function displayQRCode(data) {
    elements.qrPlaceholder.classList.add('hidden');
    elements.qrResult.classList.remove('hidden');
    elements.qrImage.src = data.qrCode;
    elements.qrUrl.textContent = state.currentImageUrl;
    elements.actions.style.display = 'flex';
    
    state.currentQRCode = data.qrCode;
    
    showNotification('二维码生成成功！', 'success');
}

function handleDownload() {
    if (!state.currentQRCode) {
        showNotification('没有可下载的二维码', 'error');
        return;
    }
    
    const link = document.createElement('a');
    link.href = state.currentQRCode;
    link.download = `qrcode-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification('下载成功！', 'success');
}

async function handleCopy() {
    if (!state.currentImageUrl) {
        showNotification('没有可复制的链接', 'error');
        return;
    }
    
    try {
        await navigator.clipboard.writeText(state.currentImageUrl);
        showNotification('链接已复制到剪贴板', 'success');
    } catch (error) {
        console.error('复制失败:', error);
        showNotification('复制失败', 'error');
    }
}

function handleTest() {
    if (!state.currentImageUrl) {
        showNotification('没有可测试的链接', 'error');
        return;
    }
    
    window.open(state.currentImageUrl, '_blank');
}

function showNotification(message, type = 'info') {
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

document.addEventListener('DOMContentLoaded', init);

window.QuantumQR = {
    state,
    generate: handleGenerate,
    download: handleDownload,
    copy: handleCopy,
    test: handleTest
};