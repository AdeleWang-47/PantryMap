# 本地前后端联调说明

前端（Next.js）和可选后端在本地同时运行，便于修改和测试前端设计。

## 一、前端（必选）

在**项目根目录**执行：

```bash
npm install
npm run dev:local
```

- 访问地址：**http://127.0.0.1:3000**
- 热更新：改 `app/`、`components/` 等会自动刷新

若提示端口被占用或 “another instance of next dev running”，可先关掉其他 Next 进程再运行：

```bash
# 查看占用 3000 端口的进程（可选）
lsof -i :3000
# 结束该进程后再执行 npm run dev:local
```

## 二、后端（按需）

### 方式 A：Azure Functions（推荐，端口 7071）

适用于需要调用 `/api/health`、地图/传感器等接口时。

1. 安装 [Azure Functions Core Tools](https://learn.microsoft.com/azure/azure-functions/functions-run-local)（若未安装）：

   ```bash
   npm install -g azure-functions-core-tools@4
   ```

2. 在项目里启动：

   ```bash
   cd PantryMap/functions-backend
   npm install
   npm run build
   npm start
   ```

- 本地 API 根地址：**http://localhost:7071/api**
- 例如健康检查：http://localhost:7071/api/health

### 方式 B：Express 后端（端口 5000）

需要 SQLite/PostgreSQL 等数据库，且本机需能编译 `sqlite3` 原生模块（需 Python 与 build tools）。

```bash
cd PantryMap/backend
npm install
npm run dev
```

- API 根地址：**http://localhost:5000/api**

## 三、同时跑前端 + 后端

开两个终端：

| 终端 1（前端） | 终端 2（后端） |
|----------------|----------------|
| `cd 项目根目录` | `cd PantryMap/functions-backend` |
| `npm run dev:local` | `npm run build && npm start` |
| 浏览器打开 http://127.0.0.1:3000 | 后端 http://localhost:7071/api |

前端表单提交（如 Update 页）走 Next.js 的 `/api/submit`，会转发到 Google Apps Script，不依赖本地后端。若页面会请求地图/传感器等接口，需把前端里 API 基地址配成 `http://localhost:7071/api`（或 5000）再联调。
