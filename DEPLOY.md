# 量子码 - 部署指南

## 方案一：本地/自己的服务器部署

### 步骤

1. 解压 `qr-code-generator.zip`
2. 进入目录，安装依赖：
   ```bash
   npm install
   ```
3. 启动服务：
   ```bash
   npm start
   ```
4. 浏览器访问 `http://localhost:3000`

### 局域网访问（让同 WiFi 下的手机扫码测试）

修改 `server/server.js`，在启动部分将 `localhost` 改为 `0.0.0.0`：
```javascript
app.listen(PORT, '0.0.0.0', () => { ... });
```

然后其他人通过你的 IP 地址访问，例如：`http://192.168.1.100:3000`

---

## 方案二：免费云平台一键部署

### 推荐平台：Railway（免费额度足够）

1. 注册 https://railway.app （用 GitHub 账号登录）
2. 新建项目 → "Deploy from GitHub repo"
3. 上传代码到 GitHub，然后连接 Railway
4. 自动识别 Node.js，自动部署
5. 获得一个 `xxx.railway.app` 的公网域名

### 其他免费平台

| 平台 | 免费额度 | 特点 |
|------|-----------|------|
| **Railway** | $5/月免费额度 | 最推荐，简单 |
| **Render** | 永久免费（休眠） | 适合轻量使用 |
| **Fly.io** | 3个小型VM免费 | 速度快 |
| **Vercel** | 个人免费 | 需拆分前后端 |

---

## 方案三：VPS/云服务器部署

### 以 Ubuntu + Nginx 为例

```bash
# 1. 安装 Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. 上传并解压项目
scp qr-code-generator.zip user@your-server:/var/www/
ssh user@your-server
cd /var/www && unzip qr-code-generator.zip && cd qr-code-generator
npm install --production

# 3. 使用 PM2 守护进程
npm install -g pm2
pm2 start server/server.js --name qr-generator
pm2 save
pm2 startup

# 4. 配置 Nginx 反向代理
sudo apt install nginx
```

Nginx 配置（`/etc/nginx/sites-available/qr`）：
```
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 环境变量配置

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | 3000 | 服务端口 |
| `NODE_ENV` | - | 设为 `production` 开启生产模式 |

---

## 注意事项

1. **上传目录持久化**：云平台重启后 `uploads/` 会清空，生产环境建议使用云存储（OSS/S3）
2. **文件大小限制**：Nginx 默认限制上传 1MB，需修改 `client_max_body_size`
3. **HTTPS**：生产环境务必开启 HTTPS（Railway/Render 自动提供）