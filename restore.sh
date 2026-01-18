#!/bin/bash

###############################################################################
# 硬件日志管理系统 - 数据库恢复脚本
# 
# 使用方法：
#   chmod +x restore.sh
#   ./restore.sh <backup_file>
#
# 示例：
#   ./restore.sh backups/backup_20240119_120000.sql.gz
###############################################################################

set -e

# 配置
CONTAINER_NAME="hardware-log-mysql"
DB_NAME="hardware_logs"
DB_USER="root"

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 日志函数
log_info() {
    echo -e "${GREEN}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# 检查参数
check_arguments() {
    if [ $# -eq 0 ]; then
        log_error "请指定备份文件"
        echo ""
        echo "使用方法: $0 <backup_file>"
        echo ""
        echo "可用的备份文件:"
        ls -lh backups/backup_*.sql.gz 2>/dev/null | awk '{print "  " $9 " (" $5 ")"}'
        echo ""
        exit 1
    fi
    
    BACKUP_FILE="$1"
    
    if [ ! -f "$BACKUP_FILE" ]; then
        log_error "备份文件不存在: $BACKUP_FILE"
        exit 1
    fi
}

# 检查容器是否运行
check_container() {
    if ! docker ps | grep -q "$CONTAINER_NAME"; then
        log_error "容器 $CONTAINER_NAME 未运行"
        exit 1
    fi
}

# 获取数据库密码
get_db_password() {
    if [ -f .env.production ]; then
        DB_PASSWORD=$(grep "^DB_PASSWORD=" .env.production | cut -d '=' -f2)
    else
        log_error "找不到 .env.production 文件"
        exit 1
    fi
    
    if [ -z "$DB_PASSWORD" ]; then
        log_error "无法获取数据库密码"
        exit 1
    fi
}

# 确认恢复操作
confirm_restore() {
    echo ""
    log_warn "警告：此操作将覆盖当前数据库中的所有数据！"
    echo ""
    echo "备份文件: $BACKUP_FILE"
    echo "数据库: $DB_NAME"
    echo ""
    read -p "确认要恢复吗？(yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        log_info "操作已取消"
        exit 0
    fi
}

# 创建当前数据库备份
create_safety_backup() {
    log_info "创建安全备份..."
    
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local safety_backup="backups/safety_backup_${timestamp}.sql.gz"
    
    if docker exec "$CONTAINER_NAME" mysqldump \
        -u "$DB_USER" \
        -p"$DB_PASSWORD" \
        --single-transaction \
        --quick \
        --lock-tables=false \
        "$DB_NAME" | gzip > "$safety_backup"; then
        
        log_info "安全备份已创建: $safety_backup"
        return 0
    else
        log_error "创建安全备份失败"
        return 1
    fi
}

# 执行恢复
perform_restore() {
    log_info "开始恢复数据库..."
    
    # 解压备份文件
    local temp_file="/tmp/restore_temp_$$.sql"
    
    if [[ "$BACKUP_FILE" == *.gz ]]; then
        log_info "解压备份文件..."
        gunzip -c "$BACKUP_FILE" > "$temp_file"
    else
        cp "$BACKUP_FILE" "$temp_file"
    fi
    
    # 恢复数据库
    log_info "导入数据..."
    if docker exec -i "$CONTAINER_NAME" mysql \
        -u "$DB_USER" \
        -p"$DB_PASSWORD" \
        "$DB_NAME" < "$temp_file"; then
        
        log_info "数据库恢复成功"
        rm -f "$temp_file"
        return 0
    else
        log_error "数据库恢复失败"
        rm -f "$temp_file"
        return 1
    fi
}

# 验证恢复
verify_restore() {
    log_info "验证数据库..."
    
    # 检查表是否存在
    local table_count=$(docker exec "$CONTAINER_NAME" mysql \
        -u "$DB_USER" \
        -p"$DB_PASSWORD" \
        -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$DB_NAME'" 2>/dev/null)
    
    if [ "$table_count" -gt 0 ]; then
        log_info "数据库验证通过（表数量: $table_count）"
        return 0
    else
        log_error "数据库验证失败"
        return 1
    fi
}

# 重启应用服务
restart_app() {
    log_info "重启应用服务..."
    
    if docker-compose -f docker-compose.prod.yml restart app; then
        log_info "应用服务已重启"
        return 0
    else
        log_warn "应用服务重启失败，请手动重启"
        return 1
    fi
}

# 主函数
main() {
    echo ""
    echo "=========================================="
    echo "  数据库恢复脚本"
    echo "=========================================="
    echo ""
    
    # 检查参数
    check_arguments "$@"
    
    # 检查容器
    check_container
    
    # 获取数据库密码
    get_db_password
    
    # 确认操作
    confirm_restore
    
    # 创建安全备份
    if ! create_safety_backup; then
        log_error "无法创建安全备份，操作已取消"
        exit 1
    fi
    
    # 执行恢复
    if perform_restore; then
        # 验证恢复
        if verify_restore; then
            # 重启应用
            restart_app
            
            echo ""
            echo "=========================================="
            log_info "恢复任务完成"
            echo "=========================================="
            echo ""
        else
            log_error "恢复验证失败"
            exit 1
        fi
    else
        log_error "恢复任务失败"
        exit 1
    fi
}

# 运行主函数
main "$@"
