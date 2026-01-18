#!/bin/bash

###############################################################################
# 硬件日志管理系统 - 腾讯云快速部署脚本
# 
# 使用方法：
#   chmod +x deploy.sh
#   ./deploy.sh
###############################################################################

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查命令是否存在
check_command() {
    if ! command -v $1 &> /dev/null; then
        log_error "$1 未安装，请先安装 $1"
        exit 1
    fi
}

# 检查 Docker 和 Docker Compose
check_dependencies() {
    log_info "检查依赖..."
    check_command docker
    check_command docker-compose
    log_info "依赖检查通过"
}

# 创建环境配置文件
create_env_file() {
    if [ -f .env.production ]; then
        log_warn ".env.production 已存在，跳过创建"
        return
    fi

    log_info "创建生产环境配置文件..."
    
    # 生成随机密码
    DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    
    cat > .env.production << EOF
# 服务器配置
NODE_ENV=production
PORT=3000

# 数据库配置
DB_HOST=mysql
DB_PORT=3306
DB_NAME=hardware_logs
DB_USER=root
DB_PASSWORD=${DB_PASSWORD}

# 数据库连接池
DB_POOL_MIN=2
DB_POOL_MAX=10

# 日志配置
LOG_LEVEL=info
LOG_FILE=/app/logs/app.log

# API 配置
API_PREFIX=/api
MAX_PAGE_SIZE=100
DEFAULT_PAGE_SIZE=20
EOF

    log_info "环境配置文件已创建"
    log_warn "数据库密码: ${DB_PASSWORD}"
    log_warn "请妥善保管此密码！"
}

# 创建生产环境 Docker Compose 配置
create_docker_compose() {
    if [ -f docker-compose.prod.yml ]; then
        log_warn "docker-compose.prod.yml 已存在，跳过创建"
        return
    fi

    log_info "创建生产环境 Docker Compose 配置..."
    cp docker-compose.yml docker-compose.prod.yml
    
    # 修改 restart 策略为 always
    sed -i 's/restart: unless-stopped/restart: always/g' docker-compose.prod.yml
    
    log_info "Docker Compose 配置已创建"
}

# 创建必要的目录
create_directories() {
    log_info "创建必要的目录..."
    mkdir -p logs
    mkdir -p backups
    log_info "目录创建完成"
}

# 构建 Docker 镜像
build_images() {
    log_info "构建 Docker 镜像..."
    docker-compose -f docker-compose.prod.yml build
    log_info "镜像构建完成"
}

# 启动服务
start_services() {
    log_info "启动服务..."
    docker-compose -f docker-compose.prod.yml up -d
    log_info "服务已启动"
}

# 等待服务就绪
wait_for_services() {
    log_info "等待服务就绪..."
    
    # 等待最多 60 秒
    for i in {1..60}; do
        if curl -s http://localhost:3000/health > /dev/null 2>&1; then
            log_info "服务已就绪"
            return 0
        fi
        echo -n "."
        sleep 1
    done
    
    log_error "服务启动超时"
    return 1
}

# 显示服务状态
show_status() {
    log_info "服务状态："
    docker-compose -f docker-compose.prod.yml ps
}

# 显示访问信息
show_access_info() {
    echo ""
    echo "=========================================="
    log_info "部署完成！"
    echo "=========================================="
    echo ""
    echo "访问地址："
    echo "  - 健康检查: http://localhost:3000/health"
    echo "  - API 文档: http://localhost:3000/api"
    echo ""
    echo "常用命令："
    echo "  - 查看日志: docker-compose -f docker-compose.prod.yml logs -f"
    echo "  - 重启服务: docker-compose -f docker-compose.prod.yml restart"
    echo "  - 停止服务: docker-compose -f docker-compose.prod.yml stop"
    echo "  - 查看状态: docker-compose -f docker-compose.prod.yml ps"
    echo ""
    echo "配置文件："
    echo "  - 环境变量: .env.production"
    echo "  - Docker Compose: docker-compose.prod.yml"
    echo ""
    echo "=========================================="
}

# 主函数
main() {
    echo ""
    echo "=========================================="
    echo "  硬件日志管理系统 - 快速部署"
    echo "=========================================="
    echo ""
    
    # 检查依赖
    check_dependencies
    
    # 创建配置文件
    create_env_file
    create_docker_compose
    
    # 创建目录
    create_directories
    
    # 构建和启动
    build_images
    start_services
    
    # 等待服务就绪
    if wait_for_services; then
        show_status
        show_access_info
    else
        log_error "部署失败，请查看日志"
        docker-compose -f docker-compose.prod.yml logs
        exit 1
    fi
}

# 运行主函数
main
