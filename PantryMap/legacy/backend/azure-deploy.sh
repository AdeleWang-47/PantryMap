#!/bin/bash

# Azure 部署脚本
# 使用方法: ./azure-deploy.sh

set -e

echo "🚀 开始 Azure 部署流程..."

# 检查 Azure CLI
if ! command -v az &> /dev/null; then
    echo "❌ Azure CLI 未安装。请先安装: https://docs.microsoft.com/cli/azure/install-azure-cli"
    exit 1
fi

# 检查登录
echo "📋 检查 Azure 登录状态..."
az account show &> /dev/null || {
    echo "请先登录 Azure..."
    az login
}

# 提示输入资源组、部署模式和名称
read -p "输入资源组名称 (默认: pantrymap-rg): " RESOURCE_GROUP
RESOURCE_GROUP=${RESOURCE_GROUP:-pantrymap-rg}

read -p "输入 App Service 名称 (全局唯一, 默认: pantrymap-backend-$(date +%s)): " APP_NAME
APP_NAME=${APP_NAME:-pantrymap-backend-$(date +%s)}

read -p "输入 PostgreSQL 服务器名称 (全局唯一, 默认: pantrymap-db-$(date +%s)): " DB_SERVER
DB_SERVER=${DB_SERVER:-pantrymap-db-$(date +%s)}

read -p "输入数据库管理员用户名 (默认: pantryadmin): " DB_USER
DB_USER=${DB_USER:-pantryadmin}

read -s -p "输入数据库密码: " DB_PASSWORD
echo ""

read -p "输入区域 (默认: eastus): " LOCATION
LOCATION=${LOCATION:-eastus}

read -p "选择部署模式 appservice/aci (默认: aci): " DEPLOY_MODE
DEPLOY_MODE=${DEPLOY_MODE:-aci}

echo ""
echo "📦 创建资源组..."
az group create --name $RESOURCE_GROUP --location $LOCATION

echo ""
echo "🗄️ 创建 PostgreSQL Flexible Server..."
# 检查服务器是否已存在
EXISTING_SERVER=$(az postgres flexible-server show \
    --resource-group $RESOURCE_GROUP \
    --name $DB_SERVER \
    --query name -o tsv 2>/dev/null)

if [ -n "$EXISTING_SERVER" ]; then
    echo "✅ PostgreSQL 服务器 '$DB_SERVER' 已存在，跳过创建"
else
    echo "📝 正在创建新的 PostgreSQL Flexible Server..."
    az postgres flexible-server create \
        --resource-group $RESOURCE_GROUP \
        --name $DB_SERVER \
        --location $LOCATION \
        --admin-user $DB_USER \
        --admin-password $DB_PASSWORD \
        --sku-name Standard_B1ms \
        --tier Burstable \
        --version 13 \
        --storage-size 32 \
        --public-access 0.0.0.0
    echo "✅ PostgreSQL 服务器创建成功！"
fi

echo ""
echo "🔓 配置数据库防火墙规则..."
echo "=========================================="
echo "防火墙规则说明："
echo "1. AllowAzureServices: 允许所有 Azure 服务访问（用于 App Service 连接数据库）"
echo "2. AllowMyIP: 允许当前开发机器的 IP 访问（用于本地开发和迁移数据）"
echo "=========================================="

# 规则 1: 允许 Azure 服务访问（App Service 需要此规则才能连接数据库）
echo ""
echo "📝 检查/添加规则: AllowAzureServices (0.0.0.0 - 0.0.0.0)"
EXISTING_RULE=$(az postgres flexible-server firewall-rule show \
    --resource-group $RESOURCE_GROUP \
    --name $DB_SERVER \
    --rule-name AllowAzureServices \
    --query name -o tsv 2>/dev/null)

if [ -n "$EXISTING_RULE" ]; then
    echo "✅ 防火墙规则 'AllowAzureServices' 已存在，跳过"
else
    az postgres flexible-server firewall-rule create \
        --resource-group $RESOURCE_GROUP \
        --name $DB_SERVER \
        --rule-name AllowAzureServices \
        --start-ip-address 0.0.0.0 \
        --end-ip-address 0.0.0.0 && \
        echo "✅ 规则添加成功" || \
        echo "⚠️ 规则可能已存在或添加失败"
fi

# 规则 2: 获取并添加当前开发机器的 IP 地址
echo ""
echo "📝 获取当前开发机器的公网 IP 地址..."
# 尝试多个 IP 查询服务（优先使用 IPv4）
MY_IP=$(curl -s --max-time 5 -4 ifconfig.me 2>/dev/null || \
        curl -s --max-time 5 -4 ifconfig.io 2>/dev/null || \
        curl -s --max-time 5 ipv4.icanhazip.com 2>/dev/null || \
        echo "")

if [ -n "$MY_IP" ] && [[ $MY_IP =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$ ]]; then
    echo "✅ 检测到当前 IP: $MY_IP"
    echo "📝 检查/添加规则: AllowMyIP ($MY_IP - $MY_IP)"
    EXISTING_MYIP=$(az postgres flexible-server firewall-rule show \
        --resource-group $RESOURCE_GROUP \
        --name $DB_SERVER \
        --rule-name AllowMyIP \
        --query name -o tsv 2>/dev/null)
    
    if [ -n "$EXISTING_MYIP" ]; then
        echo "✅ 防火墙规则 'AllowMyIP' 已存在，跳过"
    else
        az postgres flexible-server firewall-rule create \
            --resource-group $RESOURCE_GROUP \
            --name $DB_SERVER \
            --rule-name AllowMyIP \
            --start-ip-address $MY_IP \
            --end-ip-address $MY_IP && \
            echo "✅ 防火墙规则添加成功！" || \
            echo "⚠️ 无法添加当前 IP，请稍后在 Azure Portal 中手动配置"
    fi
else
    echo "⚠️ 无法获取当前 IP 地址"
    echo ""
    echo "手动添加防火墙规则的方法："
    echo "1. 获取你的 IP: curl -4 ifconfig.me"
    echo "2. 在 Azure Portal 中添加:"
    echo "   PostgreSQL 服务器 → 网络 → 添加防火墙规则"
    echo "3. 或使用命令行:"
    echo "   az postgres flexible-server firewall-rule create \\"
    echo "     --resource-group $RESOURCE_GROUP \\"
    echo "     --name $DB_SERVER \\"
    echo "     --rule-name AllowMyIP \\"
    echo "     --start-ip-address YOUR_IP \\"
    echo "     --end-ip-address YOUR_IP"
    echo ""
    echo "⚠️ 注意：如果无法添加 IP，你可能无法从本地连接数据库进行迁移"
fi
echo ""

echo ""
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_SERVER}.postgres.database.azure.com:5432/postgres?sslmode=require"

if [ "$DEPLOY_MODE" = "appservice" ]; then
  echo "🌐 创建 App Service..."
  az appservice plan create \
      --resource-group $RESOURCE_GROUP \
      --name "$APP_NAME-plan" \
      --sku B1 \
      --location $LOCATION \
      --is-linux || true

  az webapp create \
      --resource-group $RESOURCE_GROUP \
      --name $APP_NAME \
      --runtime "NODE:18-lts" \
      --plan "$APP_NAME-plan"

  echo ""
  echo "⚙️ 配置环境变量..."
  az webapp config appsettings set \
      --resource-group $RESOURCE_GROUP \
      --name $APP_NAME \
      --settings \
          DATABASE_URL="$DATABASE_URL" \
          DB_TYPE=postgres \
          NODE_ENV=production \
          PORT=8080

  echo ""
  echo "✅ 部署完成！"
  echo "🌐 App Service URL: https://${APP_NAME}.azurewebsites.net"
else
  echo "🐳 使用 Azure Container Instances (ACI) 部署..."
  # 创建/获取 ACR
  read -p "输入 ACR 名称 (全局唯一, 默认: ${APP_NAME//-/}acr): " ACR_NAME
  ACR_NAME=${ACR_NAME:-${APP_NAME//-/}acr}

  ACR_EXISTS=$(az acr show --name $ACR_NAME --resource-group $RESOURCE_GROUP --query name -o tsv 2>/dev/null)
  if [ -z "$ACR_EXISTS" ]; then
    echo "📝 创建 Azure Container Registry: $ACR_NAME"
    az acr create --resource-group $RESOURCE_GROUP --name $ACR_NAME --sku Basic --location $LOCATION
  else
    echo "✅ ACR '$ACR_NAME' 已存在，跳过创建"
  fi

  ACR_LOGIN=$(az acr show --name $ACR_NAME --resource-group $RESOURCE_GROUP --query loginServer -o tsv)

  echo "🛠️ 通过 ACR 远程构建镜像 (无需本地 Docker)..."
  az acr build --registry $ACR_NAME --image pantrymap-backend:latest ../backend

  echo "🚚 创建 ACI 容器实例..."
  ACI_NAME="${APP_NAME}-aci"
  DNS_LABEL="${APP_NAME}-$(date +%s)"

  # 获取 ACR 凭据
  ACR_USER=$(az acr credential show --name $ACR_NAME --resource-group $RESOURCE_GROUP --query username -o tsv)
  ACR_PASS=$(az acr credential show --name $ACR_NAME --resource-group $RESOURCE_GROUP --query passwords[0].value -o tsv)

  az container create \
    --resource-group $RESOURCE_GROUP \
    --name $ACI_NAME \
    --image $ACR_LOGIN/pantrymap-backend:latest \
    --cpu 1 --memory 1.5 \
    --ports 5000 \
    --dns-name-label $DNS_LABEL \
    --environment-variables \
        DATABASE_URL="$DATABASE_URL" \
        DB_TYPE=postgres \
        NODE_ENV=production \
        PORT=5000 \
    --registry-login-server $ACR_LOGIN \
    --registry-username $ACR_USER \
    --registry-password $ACR_PASS \
    --location $LOCATION

  echo ""
  FQDN=$(az container show --resource-group $RESOURCE_GROUP --name $ACI_NAME --query ipAddress.fqdn -o tsv)
  echo "✅ ACI 部署完成！"
  echo "🌐 Public URL: http://$FQDN:5000"
fi

echo ""
echo "📋 下一步："
echo "1) 运行数据库迁移导入数据："
echo "   DB_TYPE=postgres DATABASE_URL='$DATABASE_URL' npm run migrate:pg"
echo "2) 配置存储与密钥：将 AZURE_STORAGE_ACCOUNT/AZURE_STORAGE_KEY 写入 ACI 环境变量或 Key Vault"
echo "3) 测试图片直传：POST /api/donations/sas → PUT 到 Blob → POST /api/donations"
echo "4) 测试传感器上报：POST /api/telemetry、GET /api/telemetry?pantryId=...&latest=true"
echo "5) 在前端 api.js 中将 API_BASE_URL 指向部署地址"
echo "6) 验证健康检查：/api/health"

