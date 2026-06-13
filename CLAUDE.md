@AGENTS.md

# service-platform 项目说明

本文件由 Claude Code 在每次会话启动时自动读取，作为项目上下文。

---

## 一、项目概览

农机售后服务透明化平台，包含两部分：
1. **service-platform** — Next.js 后端 + 调度后台 + 客户追踪页
2. **worker-miniprogram** — 微信小程序师傅端

---

## 二、本地路径

```
WSL: /mnt/c/Users/Administrator/Desktop/AI对话阶段存储/AI对话阶段存储/服务透明化制作/service-platform
WSL: /mnt/c/Users/Administrator/Desktop/AI对话阶段存储/AI对话阶段存储/服务透明化制作/worker-miniprogram
```

> ⚠️ 路径中重复的 `AI对话阶段存储/AI对话阶段存储` 是误操作产生的重复目录，待整理时去重。
> 交接文档原始路径记录的是 `C:\Users\Haiyang\...`（另一台电脑），本机实际路径已更正为上述 Administrator 路径。

---

## 三、GitHub 仓库

- service-platform: https://github.com/xinda04336393416-beep/service-platform
- worker-miniprogram: https://github.com/xinda04336393416-beep/worker-miniprogram（**待建仓库后推送**，本地 main 分支已就绪 commit 5cfe2e4）

---

## 四、服务器信息

- IP：120.53.106.154
- 系统：Ubuntu，腾讯云轻量服务器（主机名 VM-0-16-ubuntu）
- 登录方式：腾讯云控制台 → 轻量应用服务器 → 登录（网页终端，密码SSH不通）

### 两套用户环境（重要！）

| 用户 | 管理项目 | PM2进程名 | 端口 | 说明 |
|---|---|---|---|---|
| root | agri-system（农机销售平台，另一项目） | agri | 3000 | 不要动 |
| ubuntu | service-platform（本项目） | service-platform | 3001 | 所有操作用此用户 |

切换：`su - ubuntu`

### 部署流程

```bash
su - ubuntu
cd /var/www/service-platform
bash deploy.sh
```

deploy.sh 内容（已创建，commit 370f0f1）：
```bash
#!/bin/bash
set -e
cd /var/www/service-platform
git pull
npm run build
pm2 restart service-platform
pm2 status service-platform
```

git pull 如遇冲突：`git reset --hard origin/main` 强制覆盖本地

### Nginx / 域名

- 域名：njfuwu.top（阿里云购买，**正在备案中**，已提交管局审核）
- Nginx 配置：`/etc/nginx/sites-enabled/agri`
- SSL 证书：`/etc/letsencrypt/live/njfuwu.top/`（Let's Encrypt，已签发但因未备案暂无法在国内正常访问）
- 配置：80端口重定向到443，/service路径代理到3001（service-platform），其余代理到3000（agri）

**备案通过前**：只能用 `http://120.53.106.154/service/dashboard` 访问（裸IP，HTTP）
**备案通过后**：改用 `https://njfuwu.top/service/dashboard`

---

## 五、数据库（Supabase）

- service_orders 表新增字段：worker_token, worker_token_expires_at, last_lat, last_lng, last_location_at
- service_events 表新增事件类型：LOCATION_HEARTBEAT
- 派单时（assign action）自动生成 worker_token（64位hex，30天有效期）
- service_events.voice_url 字段、VOICE_NOTE 事件类型已在 schema 中，无需额外迁移
- **Supabase Storage**：需在 Dashboard 手动建 bucket `voice-notes`（public bucket），语音文件存储路径 `{orderId}/{timestamp}.mp3`

---

## 六、已完成功能清单

| 模块 | 状态 |
|---|---|
| /service/dashboard 调度后台 | ✅ 派单后显示客户链接+师傅小程序参数 |
| /service/track/[orderId] 客户追踪页 | ✅ |
| /service/worker/[orderId] H5师傅端 | ✅（无小程序时的备用方案） |
| API: orders / workers / track / location / voice | ✅ |
| 小程序 worker-miniprogram | ✅ 工单展示/出发/完成/定位心跳(10分钟)/语音录制+上传/UI美化 |
| 复制师傅参数按钮 | ✅ 已加clipboard兼容fallback |
| basePath路由bug | ✅ 已修复(/service前缀) |

---

## 七、微信小程序信息

- AppID：wxd83b39f4425d0b30
- 后端API地址：写在 `pages/worker/index.js` 第一行 `API_BASE`
  - 当前为 `https://njfuwu.top/service/api`
  - 备案通过前模拟器测试需改回 `http://120.53.106.154/service/api` 并在开发者工具勾选"不校验合法域名"
- 调试开关：`pages/worker/index.js` 顶部 `DEBUG_PARAMS`
  - 测试时填 `{ orderId: 'xxx', token: 'xxx' }`
  - **上线前必须设为 null**（commit 5d2d205）
- 服务器域名白名单：已在微信公众平台配置 `https://njfuwu.top`

---

## 八、当前未完成 / 待办

1. **worker-miniprogram 推送到GitHub待完成** — GitHub 仓库建好后，本地已就绪，执行：
   ```bash
   # WSL2 内
   WINREPO='C:\Users\Administrator\Desktop\AI对话阶段存储\AI对话阶段存储\服务透明化制作\worker-miniprogram'
   "/mnt/c/Program Files/Git/cmd/git.exe" -C "$WINREPO" push -u origin main
   ```
   或在 Windows PowerShell 内直接 `git push -u origin main`

2. **Supabase Storage bucket 待创建** — 在 Supabase Dashboard → Storage → New bucket，名称 `voice-notes`，设为 Public，语音上传才能生效

3. **service-platform 部署待执行** — 语音接口已推到 GitHub（commit 0eee348），登录服务器执行：
   ```bash
   su - ubuntu && cd /var/www/service-platform && bash deploy.sh
   ```

4. **njfuwu.top 备案审核中** — 等管局短信通知，通过后切换 API_BASE 为 HTTPS 域名并真机测试

5. **真机完整闭环未验证** — 备案通过后需测试：企业微信发卡片 → 师傅点击 → 真实定位上报 + 语音录制上传

6. **本地新电脑环境未配置** — 需安装 Git / Node.js / 微信开发者工具，从GitHub clone两个仓库

---

## 九、关键 commit 记录

- service-platform: 0eee348 (POST /api/voice 语音上传接口), 56a322b (HANDOFF部署规范), 370f0f1 (deploy.sh)
- worker-miniprogram: 5cfe2e4 (录音停止后自动上传), 5d2d205 (DEBUG_PARAMS开关) — 待push（本地main已就绪）

---

## 十、Claude Code 启动方式

```bash
claude --dangerously-skip-permissions
```
