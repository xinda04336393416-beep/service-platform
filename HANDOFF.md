# 服务透明化平台 — 项目交接文档

## 1. 项目概述

**服务透明化平台**：让客户实时看到维修进度，调度员在 PC 端派单，师傅在手机端操作工单状态。

核心价值：通过一条链接，客户随时查看「报修 → 派单 → 出发 → 完成」全流程，无需打电话询问。

---

## 2. 当前架构

```
客户浏览器          师傅手机              调度员 PC
    │                  │                     │
    └──────────────────┴─────────────────────┘
                       │
              Next.js 16 (App Router)
              腾讯云服务器 :3001
              basePath: /service
                       │
              Supabase (PostgreSQL)
              tectscwjzsrfmfktvkiq.supabase.co
```

| 层级 | 技术 |
|---|---|
| 前端框架 | Next.js 16.2.7 (App Router, Turbopack) |
| 样式 | Tailwind CSS v4 |
| 数据库 | Supabase (PostgreSQL + REST API) |
| 服务端 | 腾讯云 CVM，PM2 守护进程 |
| 反向代理 | Nginx，`location /service` → `127.0.0.1:3001` |

---

## 3. 三个页面

### 调度员端（PC 优先）
- **地址**：`http://服务器IP/service/dashboard`
- **功能**：
  - 左侧创建新工单（客户姓名/电话/地址/机型/故障描述）
  - 右侧工单列表，点击「待派单」行弹出派单面板
  - 派单面板：选择师傅、填预计到达分钟数、确认派单
  - 派单成功后弹窗显示客户查看链接，支持一键复制

### 师傅端（移动端优先）
- **地址**：`http://服务器IP/service/worker/[orderId]`
- **功能**：
  - 显示工单详情（客户、地址、故障）
  - `ASSIGNED` 状态：显示「点击出发」按钮
  - `DEPARTED` 状态：显示语音录入区域（Web Speech API，中文）+ 「完成工单」按钮
  - 完成时语音文字写入 VOICE_NOTE 事件

### 客户端（移动端优先）
- **地址**：`http://服务器IP/service/track/[orderId]`
- **功能**：
  - 显示客户姓名、机型、当前状态
  - 四步时间线：已报修 → 已派单（含师傅名+预计到达）→ 师傅已出发 → 维修完成
  - 已完成节点蓝/绿色，未到达节点灰色虚线
  - **不显示**：语音内容、师傅电话等内部信息

---

## 4. 数据库表结构

### `workers`（师傅）
| 字段 | 类型 | 说明 |
|---|---|---|
| id | uuid PK | 自动生成 |
| name | text | 师傅姓名 |
| phone | text | 联系电话（不对客户展示）|
| wxwork_userid | text | 企业微信 ID（待用）|
| is_active | boolean | 是否在岗，默认 true |
| created_at | timestamptz | 创建时间 |

### `service_orders`（工单）
| 字段 | 类型 | 说明 |
|---|---|---|
| id | uuid PK | 工单 ID，也是客户查看链接的参数 |
| customer_name | text | 客户姓名 |
| customer_phone | text | 客户电话 |
| service_location_text | text | 服务地址 |
| machine_model | text | 机器型号 |
| fault_description | text | 故障描述 |
| current_worker_id | uuid FK→workers | 当前负责师傅 |
| current_status | text | 当前状态（见枚举）|
| created_at | timestamptz | 创建时间 |

### `service_events`（事件流，只追加）
| 字段 | 类型 | 说明 |
|---|---|---|
| id | uuid PK | 自动生成 |
| order_id | uuid FK→service_orders | 所属工单 |
| worker_id | uuid FK→workers | 操作师傅（可空）|
| event_type | text | 事件类型（见枚举）|
| note | text | 附加文字（语音转文字内容）|
| voice_url | text | 语音文件 URL（待用）|
| eta_minutes | integer | 预计到达分钟数 |
| created_at | timestamptz | 事件时间 |

**event_type 枚举值**（CHECK 约束，不可随意扩展）：

| 值 | 触发时机 |
|---|---|
| `ORDER_CREATED` | 调度员创建工单 |
| `ASSIGNED` | 调度员派单给师傅 |
| `DEPARTED` | 师傅点击「出发」|
| `VOICE_NOTE` | 师傅语音录入（完成前）|
| `COMPLETED` | 师傅点击「完成工单」|
| `TRANSFERRED` | 工单转给其他师傅（待开发）|

---

## 5. 服务器信息

| 项目 | 值 |
|---|---|
| 云服务商 | 腾讯云 CVM |
| 公网 IP | `120.53.106.154` |
| 登录用户 | `root` |
| 项目目录 | `/var/www/service-platform` |
| 运行端口 | `3001`（销售平台占用 3000）|
| 进程管理 | PM2，应用名 `service-platform` |
| 反向代理 | Nginx，`location /service` |

```bash
# SSH 登录
ssh root@120.53.106.154

# 查看应用状态
pm2 list

# 查看日志
pm2 logs service-platform
```

---

## 6. 本地开发

```bash
# 克隆仓库
git clone https://github.com/xinda04336393416-beep/service-platform.git
cd service-platform

# 安装依赖
npm install

# 配置环境变量（从服务器或同事处获取）
cp .env.production .env.local

# 启动开发服务器（localhost:3000）
npm run dev
```

> 本地开发时 basePath `/service` 生效，访问地址为 `http://localhost:3000/service/dashboard`。
> fetch 路径已硬编码为 `/service/api/...`，本地与生产一致。

---

## 7. 更新部署流程

```bash
# 本地：开发完成后推送
git add .
git commit -m "feat: 你的功能描述"
git push

# 服务器：拉取、构建、重启
ssh root@120.53.106.154
cd /var/www/service-platform
git pull
npm run build
pm2 restart service-platform
```

---

## 8. 下一步待开发功能

### 近期（二阶段前）
- [ ] **dashboard 简单密码保护**：加一个 middleware 或登录页，防止外部访问派单后台
- [ ] **工单转单功能**：派单面板增加「转派」操作，写入 `TRANSFERRED` 事件，更新 `current_worker_id`
- [ ] **小程序 AppID**：待填入 `NEXT_PUBLIC_WX_APPID=`（当前未配置）

### 微信小程序师傅端
- 替代现有 H5 师傅页面 `/worker/[orderId]`
- 每 10 分钟上报一次 GPS 定位（写入 service_events 或单独位置表）
- AppID 待确认后接入微信登录，绑定 `workers.wxwork_userid`

### 二阶段：到店保养场景
- 新增工单类型字段（上门维修 / 到店保养）
- 到店场景：客户预约 → 前台接待 → 技师检查 → 报价确认 → 施工 → 完成
- 时间线步骤需扩展，`event_type` 枚举同步增加新值

---

## 9. 部署规范

### 用户环境

服务器上有两套用户环境（`root` / `ubuntu`），**service-platform 必须使用 `ubuntu` 用户操作**：

```bash
su - ubuntu
cd /var/www/service-platform
bash deploy.sh
```

> ⚠️ 不要用 root 操作 service-platform。`agri` 是另一个项目（销售平台），跑在 3000 端口，由 root 用户管理，**不要动**。

---

### 服务进程名

PM2 进程名为 **`service-platform`**（不是 `agri`）：

```bash
pm2 restart service-platform
pm2 logs service-platform
pm2 status service-platform
```

---

### 部署前检查

```bash
# 查看是否有冲突
git pull

# 如果有冲突，强制覆盖本地（放弃本地修改）
git reset --hard origin/main
git pull
```

---

### 域名信息

- 域名：**njfuwu.top**（备案中，预计通过后可用 HTTPS）
- HTTP 80 → 重定向到 443
- Nginx 配置文件：`/etc/nginx/sites-enabled/agri`
- SSL 证书：`/etc/letsencrypt/live/njfuwu.top/`

---

## 10. 编码规范

### 事件流：只追加，不修改
`service_events` 是完整的操作历史，**禁止 UPDATE 或 DELETE**。
状态以 `service_orders.current_status` 为准，事件表仅做记录。

```
✅ 正确：INSERT INTO service_events (event_type, ...) VALUES ('DEPARTED', ...)
❌ 错误：UPDATE service_events SET event_type = 'DEPARTED' WHERE ...
```

### event_type 必须用枚举值
数据库有 CHECK 约束，插入非法值会报错。新增事件类型必须：
1. 修改 `supabase/schema.sql` 里的 CHECK 约束
2. 在 Supabase SQL Editor 执行 `ALTER TABLE service_events DROP CONSTRAINT ... / ADD CONSTRAINT ...`
3. 在本文档第 4 节的枚举表里补充说明

### API 路径
所有客户端 fetch 调用须带 `/service` 前缀（与 `basePath` 一致）：
```typescript
// ✅
fetch('/service/api/orders')
// ❌
fetch('/api/orders')
```
