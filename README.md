# 量子码 - 二维码图片分享

> 🚀 上传图片，生成二维码，扫码即看

一个类似"码上游二维码"的图片分享服务。上传图片到服务器，自动生成指向该图片的二维码，扫描二维码后直接在浏览器中查看图片。

## ✨ 功能特性

- 📷 **图片上传** - 支持 JPG/PNG/GIF/WebP 格式，最大 10MB
- ⬡ **二维码生成** - 自动生成指向图片的二维码
- 📱 **扫码查看** - 手机扫码即可在浏览器中查看图片
- 🎨 **复古未来主义** - 霓虹灯风格界面设计
- 📏 **尺寸可选** - 支持小/中/大三种二维码尺寸
- 🖱️ **拖拽上传** - 支持点击或拖拽上传图片
- 📋 **链接复制** - 一键复制图片链接
- 🗑️ **图片管理** - 支持查看和删除已上传图片

## 🏗️ 技术栈

- **前端**: HTML5 + CSS3 + Vanilla JavaScript
- **后端**: Node.js + Express
- **二维码**: qrcode 库
- **上传**: multer 中间件
- **设计**: 复古未来主义 (Retro-Futurism) + 霓虹灯风格

## 🚀 快速开始

### 安装依赖

```bash
cd qr-code-generator
npm install
```

### 启动服务器

```bash
npm start
```

### 访问应用

打开浏览器访问: http://localhost:3000

## 📡 API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/upload` | 上传图片 |
| POST | `/api/generate-qr` | 生成二维码 |
| GET | `/api/images` | 获取图片列表 |
| GET | `/image/:filename` | 访问图片 |
| DELETE | `/api/image/:filename` | 删除图片 |
| GET | `/health` | 健康检查 |

### 上传图片

```bash
curl -X POST http://localhost:3000/api/upload \
  -F "image=@your-image.png"
```

响应:
```json
{
  "success": true,
  "filename": "abc123.png",
  "imageUrl": "http://localhost:3000/image/abc123.png",
  "size": 12345,
  "mimetype": "image/png"
}
```

### 生成二维码

```bash
curl -X POST http://localhost:3000/api/generate-qr \
  -H "Content-Type: application/json" \
  -d '{"url": "http://localhost:3000/image/abc123.png", "size": 300}'
```

响应:
```json
{
  "success": true,
  "qrCode": "data:image/png;base64,...",
  "url": "http://localhost:3000/image/abc123.png",
  "size": 300
}
```

## 📁 项目结构

```
qr-code-generator/
├── public/              # 前端静态文件
│   ├── index.html       # 主页面
│   ├── style.css        # 样式文件
│   └── script.js        # JavaScript 逻辑
├── server/              # 后端代码
│   └── server.js        # Express 服务器
├── uploads/             # 上传图片存储目录
├── package.json         # 项目配置
├── .gitignore           # Git 忽略规则
└── README.md            # 项目文档
```

## 🔄 工作流程

```
用户上传图片 → 服务器存储图片 → 返回图片URL → 生成二维码 → 扫码查看图片
```

1. 用户在前端选择或拖拽图片
2. 点击"上传并生成二维码"按钮
3. 服务器接收并存储图片
4. 服务器生成指向图片URL的二维码
5. 前端显示二维码和图片链接
6. 用户可以下载二维码、复制链接或测试扫码
7. 扫描二维码后，浏览器直接显示图片

## 📄 License

MIT