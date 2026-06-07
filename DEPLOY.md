# 服务器部署说明

## 环境要求

- Node.js >= 18
- PM2（全局安装）
- Nginx（反向代理）

---

## 首次部署

### 1. 上传代码到服务器

```bash
# 在本地执行，将项目传到服务器
scp -r ./service-platform root@<服务器IP>:/var/www/
```

或使用 git：

```bash
# 在服务器上执行
cd /var/www
git clone <仓库地址> service-platform
```

### 2. 安装依赖

```bash
cd /var/www/service-platform
npm install --production=false
```

### 3. 配置环境变量

`.env.production` 已包含在项目中。如需修改（例如更换 Supabase 项目），直接编辑：

```bash
nano /var/www/service-platform/.env.production
```

### 4. 构建

```bash
npm run build
```

### 5. 用 PM2 启动

```bash
# 全局安装 PM2（首次）
npm install -g pm2

# 启动应用（端口 3001）
pm2 start ecosystem.config.js --env production

# 设置开机自启
pm2 save
pm2 startup
```

### 6. 配置 Nginx 反向代理

```nginx
server {
    listen 80;
    server_name <你的域名或IP>;

    location /service {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# 重载 Nginx
nginx -t && systemctl reload nginx
```

---

## 后续更新部署

```bash
cd /var/www/service-platform

# 拉取最新代码（使用 git 时）
git pull

# 重新构建
npm run build

# 重启应用
pm2 restart service-platform
```

---

## 常用 PM2 命令

```bash
pm2 list                        # 查看所有应用状态
pm2 logs service-platform       # 查看实时日志
pm2 restart service-platform    # 重启
pm2 stop service-platform       # 停止
pm2 delete service-platform     # 删除
```

---

## 端口说明

| 应用 | 端口 |
|---|---|
| 销售平台 | 3000 |
| 服务透明化平台（本项目） | 3001 |
