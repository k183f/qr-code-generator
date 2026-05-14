// 量子码 - 二维码图片分享 后端服务
// server.js

const express = require('express');
const cors = require('cors');
const QRCode = require('qrcode');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// 确保上传目录存在
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// 中间件
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 静态文件服务
app.use(express.static(path.join(__dirname, '..', 'public')));

// 上传图片静态服务
app.use('/image', express.static(UPLOAD_DIR));

// Multer 配置 - 图片上传
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const id = crypto.randomBytes(8).toString('hex');
        cb(null, `${id}${ext}`);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mime = allowedTypes.test(file.mimetype.split('/')[1]);
        
        if (ext && mime) {
            cb(null, true);
        } else {
            cb(new Error('只支持 JPG、PNG、GIF、WebP 格式的图片'));
        }
    }
});

// 请求日志
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.url}`);
    next();
});

// 健康检查
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: '量子码 - 二维码图片分享',
        version: '2.0.0',
        timestamp: new Date().toISOString()
    });
});

// API 根路径
app.get('/api', (req, res) => {
    res.json({
        name: '量子码 API',
        version: '2.0.0',
        endpoints: {
            upload: 'POST /api/upload',
            generateQR: 'POST /api/generate-qr',
            image: 'GET /image/:filename',
            health: 'GET /health'
        }
    });
});

// 图片上传 API
app.post('/api/upload', upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                error: 'no_file',
                message: '请上传图片文件'
            });
        }
        
        const filename = req.file.filename;
        const imageUrl = `${req.protocol}://${req.get('host')}/image/${filename}`;
        
        console.log(`✅ 图片上传成功: ${filename} -> ${imageUrl}`);
        
        res.json({
            success: true,
            filename: filename,
            imageUrl: imageUrl,
            size: req.file.size,
            mimetype: req.file.mimetype,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('上传失败:', error);
        res.status(500).json({
            error: 'upload_failed',
            message: '图片上传失败',
            details: error.message
        });
    }
});

// 根据 URL 生成二维码 API
app.post('/api/generate-qr', async (req, res) => {
    try {
        const { url, size = 300 } = req.body;
        
        if (!url || typeof url !== 'string') {
            return res.status(400).json({
                error: 'invalid_url',
                message: '请提供有效的URL'
            });
        }
        
        const qrSize = parseInt(size);
        if (isNaN(qrSize) || qrSize < 100 || qrSize > 1000) {
            return res.status(400).json({
                error: 'invalid_size',
                message: '尺寸必须在100-1000像素之间'
            });
        }
        
        console.log(`📱 生成二维码: url="${url.substring(0, 60)}...", size=${qrSize}`);
        
        const qrCodeDataURL = await QRCode.toDataURL(url, {
            errorCorrectionLevel: 'M',
            width: qrSize,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        });
        
        res.json({
            success: true,
            qrCode: qrCodeDataURL,
            url: url,
            size: qrSize,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('生成二维码失败:', error);
        res.status(500).json({
            error: 'generation_failed',
            message: '二维码生成失败',
            details: error.message
        });
    }
});

// 获取所有已上传的图片列表
app.get('/api/images', (req, res) => {
    try {
        const files = fs.readdirSync(UPLOAD_DIR).filter(f => {
            return /\.(jpg|jpeg|png|gif|webp)$/i.test(f);
        });
        
        const images = files.map(filename => {
            const stats = fs.statSync(path.join(UPLOAD_DIR, filename));
            return {
                filename,
                imageUrl: `${req.protocol}://${req.get('host')}/image/${filename}`,
                size: stats.size,
                uploadTime: stats.mtime
            };
        });
        
        res.json({
            success: true,
            count: images.length,
            images
        });
        
    } catch (error) {
        console.error('获取图片列表失败:', error);
        res.status(500).json({
            error: 'list_failed',
            message: '获取图片列表失败'
        });
    }
});

// 删除图片 API
app.delete('/api/image/:filename', (req, res) => {
    try {
        const filename = req.params.filename;
        const filepath = path.join(UPLOAD_DIR, filename);
        
        if (!fs.existsSync(filepath)) {
            return res.status(404).json({
                error: 'not_found',
                message: '图片不存在'
            });
        }
        
        fs.unlinkSync(filepath);
        console.log(`🗑️ 图片已删除: ${filename}`);
        
        res.json({
            success: true,
            message: '图片已删除',
            filename
        });
        
    } catch (error) {
        console.error('删除图片失败:', error);
        res.status(500).json({
            error: 'delete_failed',
            message: '删除图片失败'
        });
    }
});

// 404
app.use((req, res) => {
    res.status(404).json({
        error: 'not_found',
        message: '请求的资源不存在',
        path: req.url
    });
});

// 错误处理
app.use((err, req, res, next) => {
    console.error('服务器错误:', err);
    
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                error: 'file_too_large',
                message: '文件大小不能超过10MB'
            });
        }
    }
    
    res.status(500).json({
        error: 'internal_error',
        message: err.message || '服务器内部错误'
    });
});

// 启动服务器
app.listen(PORT, () => {
    console.log('='.repeat(60));
    console.log('🚀 量子码 - 二维码图片分享 v2.0');
    console.log('='.repeat(60));
    console.log(`✅ 服务启动成功`);
    console.log(`🌐 访问地址: http://localhost:${PORT}`);
    console.log(`📁 上传目录: ${UPLOAD_DIR}`);
    console.log(`📡 API 端点:`);
    console.log(`   POST /api/upload     - 上传图片`);
    console.log(`   POST /api/generate-qr - 生成二维码`);
    console.log(`   GET  /api/images      - 获取图片列表`);
    console.log(`   GET  /image/:filename  - 访问图片`);
    console.log(`   DELETE /api/image/:filename - 删除图片`);
    console.log('='.repeat(60));
});

// 优雅关闭
process.on('SIGTERM', () => {
    console.log('收到 SIGTERM 信号，准备关闭服务器...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('\n收到 SIGINT 信号，准备关闭服务器...');
    process.exit(0);
});

module.exports = app;