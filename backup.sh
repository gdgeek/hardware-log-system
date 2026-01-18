#!/bin/bash

###############################################################################
# 硬件日志管理系统 - 数据库备份脚本
# 
# 使用方法：
#   chmod +x backup.sh
#   ./backup.sh
#
# 定时备份（添加到 crontab）：
#   0 2 * * * /path/to/backup.sh >> /path/to/backup.log 2>&1
###############################################################################

set -e

# 配置
BACKUP_DIR="./backups"
CONTAINER_NAME="hardware-log-mysql"
DB_NAME="hardware_logs"
DB_USER="root"
RETENTION_DAYS=7  # 保留最近 7 天的备份

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

# 创建备份目录
create_backup_dir() {
    if [ ! -d "$BACKUP_DIR" ]; then
        mkdir -p "$BACKUP_DIR"
        log_info "创建备份目录: $BACKUP_DIR"
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
    # 从 .env.production 文件读取密码
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

# 执行备份
perform_backup() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="$BACKUP_DIR/backup_${timestamp}.sql"
    local backup_file_gz="${backup_file}.gz"
    
    log_info "开始备份数据库..."
    
    # 执行 mysqldump
    if docker exec "$CONTAINER_NAME" mysqldump \
        -u "$DB_USER" \
        -p"$DB_PASSWORD" \
        --single-transaction \
        --quick \
        --lock-tables=false \
        "$DB_NAME" > "$backup_file"; then
        
        log_info "数据库备份成功: $backup_file"
        
        # 压缩备份文件
        log_info "压缩备份文件..."
        gzip "$backup_file"
        
        # 获取文件大小
        local file_size=$(du -h "$backup_file_gz" | cut -f1)
        log_info "备份文件大小: $file_size"
        log_info "备份完成: $backup_file_gz"
        
        return 0
    else
        log_error "数据库备份失败"
        return 1
    fi
}

# 清理旧备份
cleanup_old_backups() {
    log_info "清理 $RETENTION_DAYS 天前的备份..."
    
    local deleted_count=0
    
    # 查找并删除旧备份
    while IFS= read -r file; do
        rm -f "$file"
        log_info "删除旧备份: $file"
        ((deleted_count++))
    done < <(find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +$RETENTION_DAYS)
    
    if [ $deleted_count -eq 0 ]; then
        log_info "没有需要清理的旧备份"
    else
        log_info "已清理 $deleted_count 个旧备份"
    fi
}

# 列出所有备份
list_backups() {
    log_info "现有备份列表:"
    echo ""
    
    if [ -z "$(ls -A $BACKUP_DIR/backup_*.sql.gz 2>/dev/null)" ]; then
        echo "  (无备份文件)"
    else
        ls -lh "$BACKUP_DIR"/backup_*.sql.gz | awk '{print "  " $9 " (" $5 ")"}'
    fi
    
    echo ""
}

# 验证备份
verify_backup() {
    local backup_file="$1"
    
    log_info "验证备份文件..."
    
    # 检查文件是否存在
    if [ ! -f "$backup_file" ]; then
        log_error "备份文件不存在: $backup_file"
        return 1
    fi
    
    # 检查文件大小
    local file_size=$(stat -f%z "$backup_file" 2>/dev/null || stat -c%s "$backup_file" 2>/dev/null)
    if [ "$file_size" -lt 1000 ]; then
        log_warn "备份文件可能损坏（文件太小）"
        return 1
    fi
    
    # 检查 gzip 文件完整性
    if gzip -t "$backup_file" 2>/dev/null; then
        log_info "备份文件验证通过"
        return 0
    else
        log_error "备份文件验证失败"
        return 1
    fi
}

# 主函数
main() {
    echo ""
    echo "=========================================="
    echo "  数据库备份脚本"
    echo "=========================================="
    echo ""
    
    # 创建备份目录
    create_backup_dir
    
    # 检查容器
    check_container
    
    # 获取数据库密码
    get_db_password
    
    # 执行备份
    if perform_backup; then
        # 获取最新备份文件
        latest_backup=$(ls -t "$BACKUP_DIR"/backup_*.sql.gz | head -1)
        
        # 验证备份
        verify_backup "$latest_backup"
        
        # 清理旧备份
        cleanup_old_backups
        
        # 列出所有备份
        list_backups
        
        echo "=========================================="
        log_info "备份任务完成"
        echo "=========================================="
        echo ""
    else
        log_error "备份任务失败"
        exit 1
    fi
}

# 运行主函数
main
