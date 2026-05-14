// 量子码 - 后端服务 v3.0
// 展示页 + 后台管理

const express = require('express');
const cors = require('cors');
const QRCode = require('qrcode');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// 中间件
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 静态文件
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/image', express.static(UPLOAD_DIR));

// Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const id = crypto.randomBytes(8).toString('hex');
        cb(null, `${id}${ext}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const ok = /jpeg|jpg|png|gif|webp/;
        if (ok.test(path.extname(file.originalname).toLowerCase()) && ok.test(file.mimetype.split('/')[1])) {
            cb(null, true);
        } else {
            cb(new Error('Only JPG/PNG/GIF/WebP allowed'));
        }
    }
});

// 请求日志
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// ─── 展示页：扫码后只显示图片 ───
app.get('/v/:filename', (req, res) => {
    const filename = req.params.filename;
    const filepath = path.join(UPLOAD_DIR, filename);

    // 安全校验：防止路径穿越
    const resolved = path.resolve(filepath);
    if (!resolved.startsWith(UPLOAD_DIR)) {
        return res.status(400).send('Invalid filename');
    }

    if (!fs.existsSync(filepath)) {
        return res.status(404).send(`
            <!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
            <title>404</title><style>body{display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#0a0a1a;color:#555;font-family:system-ui}</style>
            </head><body><div style="text-align:center"><div style="font-size:4rem;margin-bottom:16px">:(</div><div>图片不存在或已被删除</div></div></body></html>
        `);
    }

    const imageSrc = `/image/${filename}`;
    res.send(`
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${filename}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 100%; height: 100%; background: #0a0a1a; }
  body { display: flex; align-items: center; justify-content: center; }
  img {
    max-width: 95vw;
    max-height: 95vh;
    object-fit: contain;
    border-radius: 4px;
  }
</style>
</head>
<body>
<img src="${imageSrc}" alt="${filename}" />
</body>
</html>
    `);
});

// ─── 健康检查 ───
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: '量子码 v3.0', timestamp: new Date().toISOString() });
});

// ─── 图片上传 API ───
app.post('/api/upload', upload.single('image'), (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'no_file', message: '请上传图片' });

        const filename = req.file.filename;
        const host = `${req.protocol}://${req.get('host')}`;
        const viewUrl = `${host}/v/${filename}`;

        console.log(`✅ Uploaded: ${filename} -> ${viewUrl}`);

        res.json({
            success: true,
            filename,
            viewUrl,
            imageUrl: `${host}/image/${filename}`,
            size: req.file.size,
            mimetype: req.file.mimetype,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Upload failed:', error);
        res.status(500).json({ error: 'upload_failed', message: '上传失败' });
    }
});

// ─── 生成二维码 API ───
app.post('/api/generate-qr', async (req, res) => {
    try {
        const { url, size = 300 } = req.body;
        if (!url) return res.status(400).json({ error: 'invalid_url', message: '请提供URL' });

        const qrSize = Math.min(1000, Math.max(100, parseInt(size) || 300));
        const qrCode = await QRCode.toDataURL(url, {
            errorCorrectionLevel: 'M', width: qrSize, margin: 2,
            color: { dark: '#000000', light: '#FFFFFF' }
        });

        res.json({ success: true, qrCode, url, size: qrSize, timestamp: new Date().toISOString() });
    } catch (error) {
        res.status(500).json({ error: 'generation_failed', message: '生成失败' });
    }
});

// ─── 图片列表 API ───
app.get('/api/images', (req, res) => {
    try {
        const host = `${req.protocol}://${req.get('host')}`;
        const files = fs.readdirSync(UPLOAD_DIR).filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f));

        const images = files.map(filename => {
            const stats = fs.statSync(path.join(UPLOAD_DIR, filename));
            return {
                filename,
                viewUrl: `${host}/v/${filename}`,
                imageUrl: `${host}/image/${filename}`,
                size: stats.size,
                uploadTime: stats.mtime
            };
        });

        res.json({ success: true, count: images.length, images });
    } catch (error) {
        res.status(500).json({ error: 'list_failed', message: '获取列表失败' });
    }
});

// ─── 删除图片 API ───
app.delete('/api/image/:filename', (req, res) => {
    try {
        const filepath = path.join(UPLOAD_DIR, req.params.filename);
        if (!fs.existsSync(filepath)) return res.status(404).json({ error: 'not_found', message: '图片不存在' });
        fs.unlinkSync(filepath);
        console.log(`🗑️ Deleted: ${req.params.filename}`);
        res.json({ success: true, message: '已删除' });
    } catch (error) {
        res.status(500).json({ error: 'delete_failed', message: '删除失败' });
    }
});

// 404
app.use((req, res) => {
    res.status(404).json({ error: 'not_found', path: req.url });
});

// 错误处理
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'file_too_large', message: '文件不能超过10MB' });
    }
    res.status(500).json({ error: 'internal_error', message: err.message });
});

// 启动
app.listen(PORT, () => {
    console.log('='.repeat(50));
    console.log('🚀 量子码 v3.0 — 二维码图片分享');
    console.log('='.repeat(50));
    console.log(`🌐 后台管理: http://localhost:${PORT}`);
    console.log(`📱 展示页:   http://localhost:${PORT}/v/:filename`);
    console.log(`📡 API:      POST /api/upload`);
    console.log(`            POST /api/generate-qr`);
    console.log(`            GET  /api/images`);
    console.log(`            DELETE /api/image/:filename`);
    console.log('='.repeat(50));
});

process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));

module.exports = app;
