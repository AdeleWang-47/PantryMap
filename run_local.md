# PantryMap — Local Development Runbook (一页搞定)

> **目的**：让任何队友在本地 **10 分钟内** 跑起 PantryMap（Azure Functions 后端 + 静态前端），并能边改边验证。

---

## 前置要求
- Node.js：**18 或 20**
- Azure Functions Core Tools：**v4**

检查：
```bash
node -v
npm -v
func --version
```

---

## 一、启动后端（Azure Functions｜7071）

### 1. 进入后端目录
```bash
cd functions-backend
```

### 2. 安装依赖（首次或依赖更新后）
```bash
npm install
```

### 3. 准备 `local.settings.json`
> 路径必须是：`functions-backend/local.settings.json`

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
    "COSMOS_CONTAINER_MESSAGES": "messages"
  },
  "Host": {
    "CORS": "http://127.0.0.1:5500,http://localhost:5500",
    "CORSCredentials": false
  }
}
```

> **注意**：
> - `COSMOS_KEY` 必须是 **Primary/Secondary Key**（不是 Connection String）
> - 若 Cosmos 账户开启了 *Disable local authentication*，Key 会失效

### 4. 启动 Functions（保持该终端不关闭）
```bash
func start --port 7071
```

---

## 二、后端快速自检（30 秒）

新开一个终端：
```bash
curl -i http://localhost:7071/api/health
```
期望：`HTTP/1.1 200 OK` + `{ "status": "ok" }`

```bash
curl -i "http://localhost:7071/api/pantries?page=1&pageSize=1"
```
期望：`HTTP/1.1 200 OK`（返回 `[]` 或数据列表均可）

> 若返回 `500` 且提示 *unauthorized*：检查 Cosmos key / endpoint / 权限。

---

## 三、启动前端（静态服务｜5500）

在 **repo 根目录**：
```bash
npx serve -l 5500 frontend
```

浏览器打开：
- `http://127.0.0.1:5500/`

---

## 四、前端验证（确保连到后端）

- 打开 DevTools → **Network**
- 刷新页面
- 确认存在请求：`GET http://localhost:7071/api/pantries?...` → **200**

> 若地图空白：
> - `/api/pantries` 为 500 → 回看后端日志（Cosmos/auth）
> - 没有 `/api/pantries` 请求 → 检查页面是否正确、JS 是否 200
> - 返回 `[]` → Cosmos 中暂无 pantries 数据（需要导入）

---

## 五、常见问题速查
- **health 200，但 pantries 500**：Cosmos key / endpoint / 本地认证被禁用
- **浏览器报 CORS**：确认 `Host.CORS` 包含前端 origin（127/localhost + 5500）
- **地图加载但没点**：Network 看 `/api/pantries` 返回值

---

## 六、最常用命令（复制即用）

```bash
# 后端
cd functions-backend
npm install
func start --port 7071

# 后端自检
curl -i http://localhost:7071/api/health
curl -i "http://localhost:7071/api/pantries?page=1&pageSize=1"

# 前端（repo 根目录）
npx serve -l 5500 frontend
```

---

**完成标准**：
- 后端 `health` 为 200
- 前端 Network 中 `/api/pantries` 为 200
- 地图显示 pantry 点位或确认数据为空但链路畅通

