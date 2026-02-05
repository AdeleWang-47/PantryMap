# PantryMap — Local Development Runbook（最终版｜一页搞定）

> **目标**：让任何队友在 **10 分钟内** 在本地跑起 PantryMap（Azure Functions 后端 + 静态前端），并清楚知道：
> - 什么情况下是「最小可运行」
> - 什么情况下是「完整功能」
> - 出问题优先看哪里

---

## 一、前置要求

### 必须
- **Node.js**：18 或 20  
- **Azure Functions Core Tools**：v4

检查：
```bash
node -v
npm -v
func --version
```

### 可选（跑完整功能才需要）
- **Azure Cosmos DB**
  - containers：`pantries` / `wishlistEvents` / `wishlistAgg` / `messages`
- **Azure Storage Account**
  - 用于 donation 照片直传（SAS）

---

## 二、后端启动（Azure Functions｜7071）

> ⚠️ **重要说明**  
> `functions-backend` 是 **TypeScript 项目**。  
> **不要直接用 `func start`**（容易跑到旧的 `dist/`）。  
> 👉 **统一用 `npm start`（推荐且唯一主路径）**

### 1. 进入后端目录
```bash
cd functions-backend
```

### 2. 安装依赖
```bash
npm install
```

### 3. 准备 `local.settings.json`

路径必须是：
```
functions-backend/local.settings.json
```

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node",

    "COSMOS_ENDPOINT": "https://<your-account>.documents.azure.com:443/",
    "COSMOS_KEY": "<your-key>",
    "COSMOS_DATABASE": "microPantry",
    "COSMOS_CONTAINER_PANTRIES": "pantries",
    "COSMOS_CONTAINER_WISHLIST_EVENTS": "wishlistEvents",
    "COSMOS_CONTAINER_WISHLIST_AGG": "wishlistAgg",
    "COSMOS_CONTAINER_MESSAGES": "messages",

    "STORAGE_ACCOUNT_NAME": "<your-storage-account-name>",
    "STORAGE_ACCOUNT_KEY": "<your-storage-account-key>",
    "STORAGE_CONTAINER_DONATIONS": "donation-photos"
  },
  "Host": {
    "CORS": "http://127.0.0.1:5500,http://localhost:5500",
    "CORSCredentials": false
  }
}
```

#### 关于配置的关键说明
- `COSMOS_KEY` 必须是 **Primary / Secondary Key**（不是 connection string）
- 若 Cosmos 账户开启 **Disable local authentication**，key 会失效
- Cosmos 容器 partition key 建议：
  - `pantries`: `/id`
  - `wishlistEvents`: `/pantryId`
  - `wishlistAgg`: `/pantryId`
  - `messages`: `/pantryId`
- Storage：
  - `STORAGE_CONTAINER_DONATIONS` 需提前创建（如 `donation-photos`）
  - **未配置 Storage 时**：donation 上传相关接口会 500（属正常）

> 💡 **端口提示**  
> 如果你前端不是跑在 5500（例如 Live Server 用了 5501），请把对应 origin 加进 `Host.CORS`。

---

### 4. 启动 Functions（推荐方式）
```bash
npm start -- --port 7071
```

> 该命令会自动 build 后再启动 Functions  
> 终端需保持开启

---

## 三、运行模式说明（非常重要）

### ✅ 模式 A：最小可运行（10 分钟起飞）
- ❌ 不配 Cosmos
- ❌ 不配 Storage
- 后端 `/api/pantries` 可能返回 500
- **前端会自动 fallback 到 `frontend/pantries.json`**
- 地图 & pantry detail **可以正常展示**
- wishlist / messages / donations **不可用**

👉 **这是允许且预期的状态**

---

### ✅ 模式 B：完整功能（推荐 Demo / 集成测试）
- ✅ Cosmos DB 正常配置
- ✅ Storage Account 正常配置
- `/api/pantries` 返回 200
- wishlist / messages / donations 全部可用

---

## 四、后端快速自检（30 秒）

### 基础链路检查
```bash
curl -i "http://localhost:7071/api/pantries?page=1&pageSize=1"
```

- **完整模式**：200 OK（返回 `[]` 或数据）
- **最小模式**：500 OK（前端会 fallback，属正常）

> `GET /api/health` 是 `authLevel: function`，本地不作为必检项。

---

### （完整模式）Wishlist / Messages 自检

```bash
# wishlist
curl -i -X POST "http://localhost:7071/api/wishlist" \
  -H "Content-Type: application/json" \
  -d '{"pantryId":"1","item":"rice","quantity":2}'

curl -i "http://localhost:7071/api/wishlist?pantryId=1"
```

```bash
# messages
curl -i -X POST "http://localhost:7071/api/messages" \
  -H "Content-Type: application/json" \
  -d '{"pantryId":"1","content":"Hello from local dev","userName":"Local Tester","userAvatar":null,"photos":[]}'

curl -i "http://localhost:7071/api/messages?pantryId=1"
```

---

### （完整模式）Donations + 图片上传流程

> donations 当前是 **内存存储（24h）**，Functions 重启会清空

```bash
# 1) 申请上传 SAS
curl -s -X POST "http://localhost:7071/api/uploads/donations/sas" \
  -H "Content-Type: application/json" \
  -d '{"pantryId":"1","filename":"test.png","contentType":"image/png"}'
```

返回：
- `uploadUrl`（PUT 用）
- `blobUrl`（写入 donation 记录）

```bash
# 2) PUT 上传图片（注意 headers）
curl -i -X PUT "$UPLOAD_URL" \
  -H "x-ms-blob-type: BlockBlob" \
  -H "Content-Type: image/png" \
  --data-binary "@/absolute/path/to/test.png"
```

```bash
# 3) 写 donation
curl -i -X POST "http://localhost:7071/api/donations" \
  -H "Content-Type: application/json" \
  -d '{"pantryId":"1","donationSize":"medium_donation","note":"Test donation","donationItems":["rice"],"photoUrls":["'"$BLOB_URL"'"]}'
```

```bash
# 4) 拉 donation 列表
curl -i "http://localhost:7071/api/donations?pantryId=1&page=1&pageSize=5"
```

```bash
# 5) 申请 read-only SAS（前端 <img> 用）
curl -i "http://localhost:7071/api/uploads/donations/read-sas?blobUrl=$BLOB_URL"
```

---

## 五、前端启动（静态服务｜5500）

> ⚠️ **不要直接双击 index.html（file://）**

在 repo 根目录：
```bash
npx serve -l 5500 frontend
```

浏览器打开：
```
http://127.0.0.1:5500/
```

---

## 六、前端验证要点

打开 DevTools → **Network** → 刷新页面：

### 必须看到
- `GET http://localhost:7071/api/pantries`（200 或 500 均可）

### 完整模式额外验证
- Wishlist：`POST /api/wishlist` → `GET /api/wishlist`
- Messages：`POST /api/messages` → `GET /api/messages`
- Donations：
  - `POST /api/uploads/donations/sas`
  - `PUT *.blob.core.windows.net`
  - `POST /api/donations`
  - `GET /api/donations`

---

## 七、常见问题速查

- **func start 报 storage 错误**
  - 需要 Azurite：
    ```bash
    npm i -g azurite
    azurite
    ```
- **浏览器 CORS 报错**
  - 检查 `Host.CORS` 是否包含你的前端端口
- **地图空白**
  - `/api/pantries` 500 + 前端 fallback 是否生效
- **donation 图片 PUT 失败**
  - 必须带 `x-ms-blob-type: BlockBlob`
  - 必须用 `--data-binary`

---

## 八、最常用命令（复制即用）

```bash
# 后端
cd functions-backend
npm install
npm start -- --port 7071

# 后端自检
curl -i "http://localhost:7071/api/pantries?page=1&pageSize=1"

# 前端
npx serve -l 5500 frontend
```

---

## ✅ 完成标准

### 最小模式
- 前端页面可打开
- 地图能显示 pantry 点位（来自 fallback JSON）

### 完整模式
- `/api/pantries` 返回 200
- wishlist / messages / donations 正常工作
