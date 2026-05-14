// 量子码 v3.0 - 后端服务
// Render.com 部署 | Telegraph 图床

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const QRCode = require('qrcode');
const axios = require('axios');
const FormData = require('form-data');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 日志
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// 健康检查
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: '量子码', version: '3.0' });
});

// 上传图片 → Telegraph + 生成二维码
app.post('/api/upload', multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }
}).single('image'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: '请上传图片' });

        // 上传到 Telegraph
        const fd = new FormData();
        fd.append('file', req.file.buffer, {
            filename: req.file.originalname || 'image.jpg',
            contentType: req.file.mimetype
        });

        console.log(`📤 上传到 Telegraph: ${req.file.originalname} (${req.file.size}b)`);
        const teleRes = await axios.post('https://telegra.ph/upload', fd, {
            headers: fd.getHeaders(),
            timeout: 30000
        });

        if (!teleRes.data || !teleRes.data[0]?.src) {
            throw new Error('Telegraph 上传失败');
        }

        const imageSrc = 'https://telegra.ph' + teleRes.data[0].src;

        // 构建查看链接
        const proto = req.get('X-Forwarded-Proto') || req.protocol;
        const host = req.get('X-Forwarded-Host') || req.get('host');
        const baseUrl = `${proto}://${host}`;
        const viewUrl = `${baseUrl}/v?src=${encodeURIComponent(imageSrc)}`;

        // 生成二维码
        console.log(`📱 生成二维码: ${viewUrl}`);
        const qrDataUrl = await QRCode.toDataURL(viewUrl, {
            width: 600,
            margin: 2,
            errorCorrectionLevel: 'M',
            color: { dark: '#000000', light: '#FFFFFF' }
        });

        res.json({
            success: true,
            imageSrc,
            viewUrl,
            qrCode: qrDataUrl,
            filename: req.file.originalname,
            size: req.file.size
        });

        console.log(`✅ 完成: ${imageSrc}`);

    } catch (err) {
        console.error('上传失败:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// 查看页路由
app.get('/v', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'viewer.html'));
});

// 404
app.use((req, res) => {
    res.status(404).json({ error: 'Not Found' });
});

app.listen(PORT, () => {
    console.log('');
    console.log('══════════════════════════════════════');
    console.log('  🚀 量子码 v3.0');
    console.log('══════════════════════════════════════');
    console.log(`  端口: ${PORT}`);
    console.log(`  地址: http://localhost:${PORT}`);
    console.log('══════════════════════════════════════');
});
