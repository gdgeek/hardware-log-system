/**
 * 硬件日志管理系统 - 前端应用逻辑
 */

// ===== API 服务 =====
const API_BASE = '/api/v1';

// ===== 认证工具 =====
const auth = {
  getToken() {
    return localStorage.getItem('admin_token');
  },
  setToken(token) {
    localStorage.setItem('admin_token', token);
  },
  setUser(user) {
    localStorage.setItem('admin_user', JSON.stringify(user));
  },
  getUser() {
    const user = localStorage.getItem('admin_user');
    return user ? JSON.parse(user) : null;
  },
  clear() {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
  },
  getHeaders() {
    const token = this.getToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  }
};

const api = {
  // 认证相关
  async login(password) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    if (!res.ok) throw new Error('登录失败');
    return res.json();
  },

  async verifyToken() {
    const res = await fetch(`${API_BASE}/auth/verify`, {
      headers: auth.getHeaders()
    });
    return res.ok;
  },
  // 健康检查
  async getHealth() {
    const res = await fetch('/health');
    return res.json();
  },

  // 日志相关
  async getLogs(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query.append(key, value);
      }
    });
    const res = await fetch(`${API_BASE}/logs?${query}`, {
      headers: auth.getHeaders()
    });
    if (res.status === 401) handleUnauthorized();
    return res.json();
  },

  async getLogById(id) {
    const res = await fetch(`${API_BASE}/logs/${id}`, {
      headers: auth.getHeaders()
    });
    if (res.status === 401) handleUnauthorized();
    return res.json();
  },

  async deleteLog(id) {
    const res = await fetch(`${API_BASE}/logs/${id}`, {
      method: 'DELETE',
      headers: auth.getHeaders()
    });
    if (res.status === 401) handleUnauthorized();
    return res.status === 204;
  },

  // 报表相关
  async getDeviceReport(uuid) {
    const res = await fetch(`${API_BASE}/reports/device/${uuid}`, {
      headers: auth.getHeaders()
    });
    if (res.status === 401) handleUnauthorized();
    return res.json();
  },

  async getTimeRangeReport(startTime, endTime) {
    const query = new URLSearchParams({ startTime, endTime });
    const res = await fetch(`${API_BASE}/reports/timerange?${query}`, {
      headers: auth.getHeaders()
    });
    if (res.status === 401) handleUnauthorized();
    return res.json();
  },

  async getErrorReport() {
    const res = await fetch(`${API_BASE}/reports/errors`, {
      headers: auth.getHeaders()
    });
    if (res.status === 401) handleUnauthorized();
    return res.json();
  }
};

function handleUnauthorized() {
  auth.clear();
  showLoginPage();
}

// ===== 工具函数 =====
function formatDate(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

function formatDateForInput(date) {
  return date.toISOString().slice(0, 16);
}

function truncateText(text, maxLength = 50) {
  if (!text) return '-';
  const str = typeof text === 'object' ? JSON.stringify(text) : String(text);
  return str.length > maxLength ? str.slice(0, maxLength) + '...' : str;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function getDataTypeBadge(dataType) {
  const badgeClass = {
    record: 'badge-record',
    warning: 'badge-warning',
    error: 'badge-error'
  }[dataType] || '';
  const label = {
    record: '记录',
    warning: '警告',
    error: '错误'
  }[dataType] || dataType;
  return `<span class="badge ${badgeClass}">${label}</span>`;
}

// ===== 图表配置 =====
const chartColors = {
  primary: 'rgba(99, 102, 241, 0.8)',
  success: 'rgba(16, 185, 129, 0.8)',
  warning: 'rgba(245, 158, 11, 0.8)',
  error: 'rgba(239, 68, 68, 0.8)',
  border: 'rgba(255, 255, 255, 0.1)'
};

const chartDefaultOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: {
        color: '#a0a0b0',
        font: { family: 'Inter' }
      }
    }
  },
  scales: {
    x: {
      grid: { color: chartColors.border },
      ticks: { color: '#a0a0b0' }
    },
    y: {
      grid: { color: chartColors.border },
      ticks: { color: '#a0a0b0' }
    }
  }
};

// ===== 应用状态 =====
const state = {
  currentPage: 'dashboard',
  logs: {
    data: [],
    pagination: { page: 1, pageSize: 20, total: 0 }
  },
  filters: {},
  charts: {}
};

// ===== 认证页面切换 =====
function showLoginPage() {
  document.getElementById('login-overlay').classList.add('active');
  document.getElementById('app-content').style.display = 'none';
}

function hideLoginPage() {
  document.getElementById('login-overlay').classList.remove('active');
  document.getElementById('app-content').style.display = 'flex';
  loadDashboard();
}

// ===== 页面路由 =====
function navigateTo(page) {
  // 更新导航状态
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.page === page);
  });

  // 更新页面显示
  document.querySelectorAll('.page').forEach(section => {
    section.classList.toggle('active', section.id === `page-${page}`);
  });

  state.currentPage = page;

  // 加载页面数据
  switch (page) {
    case 'dashboard':
      loadDashboard();
      break;
    case 'logs':
      loadLogs();
      break;
    case 'reports':
      // 报表页面按需加载
      break;
  }
}

// ===== 仪表盘 =====
async function loadDashboard() {
  try {
    // 获取最新日志统计
    const logsResult = await api.getLogs({ pageSize: 100 });
    const logs = logsResult.data || [];

    // 统计各类型数量
    const counts = { record: 0, warning: 0, error: 0 };
    logs.forEach(log => {
      if (counts[log.dataType] !== undefined) {
        counts[log.dataType]++;
      }
    });

    // 更新统计卡片
    document.getElementById('stat-total-logs').textContent = logsResult.pagination?.total || logs.length;
    document.getElementById('stat-record-count').textContent = counts.record;
    document.getElementById('stat-warning-count').textContent = counts.warning;
    document.getElementById('stat-error-count').textContent = counts.error;

    // 更新最新日志表格
    updateRecentLogsTable(logs.slice(0, 10));

    // 更新图表
    updateTrendChart(logs);
    updateTypeChart(counts);
  } catch (error) {
    console.error('加载仪表盘失败:', error);
  }
}

function updateRecentLogsTable(logs) {
  const tbody = document.querySelector('#recent-logs-table tbody');
  if (logs.length === 0) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="9">暂无日志数据</td></tr>';
    return;
  }

  tbody.innerHTML = logs.map(log => `
    <tr data-id="${log.id}" class="clickable-row">
      <td>${log.id}</td>
      <td title="${log.deviceUuid}">${truncateText(log.deviceUuid, 12)}</td>
      <td>${getDataTypeBadge(log.dataType)}</td>
      <td title="${log.key || ''}">${escapeHtml(truncateText(log.key, 15) || '-')}</td>
      <td class="value-preview" title="${escapeHtml(log.value || '')}">${truncateText(log.value, 15)}</td>
      <td>${log.projectId || '-'}</td>
      <td title="${log.sessionUuid || ''}">${truncateText(log.sessionUuid, 10)}</td>
      <td>${escapeHtml(log.clientIp || '-')}</td>
      <td>${formatDate(log.createdAt)}</td>
    </tr>
  `).join('');
}

function updateTrendChart(logs) {
  const ctx = document.getElementById('chart-trend');
  if (!ctx) return;

  // 按日期分组统计
  const dateMap = {};
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const key = date.toISOString().split('T')[0];
    dateMap[key] = { record: 0, warning: 0, error: 0 };
  }

  logs.forEach(log => {
    const logDate = new Date(log.createdAt).toISOString().split('T')[0];
    if (dateMap[logDate] && log.dataType) {
      dateMap[logDate][log.dataType] = (dateMap[logDate][log.dataType] || 0) + 1;
    }
  });

  const labels = Object.keys(dateMap).map(d => d.slice(5)); // MM-DD
  const recordData = Object.values(dateMap).map(d => d.record);
  const warningData = Object.values(dateMap).map(d => d.warning);
  const errorData = Object.values(dateMap).map(d => d.error);

  if (state.charts.trend) {
    state.charts.trend.destroy();
  }

  state.charts.trend = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: '记录',
          data: recordData,
          borderColor: chartColors.success,
          backgroundColor: 'transparent',
          tension: 0.3
        },
        {
          label: '警告',
          data: warningData,
          borderColor: chartColors.warning,
          backgroundColor: 'transparent',
          tension: 0.3
        },
        {
          label: '错误',
          data: errorData,
          borderColor: chartColors.error,
          backgroundColor: 'transparent',
          tension: 0.3
        }
      ]
    },
    options: chartDefaultOptions
  });
}

function updateTypeChart(counts) {
  const ctx = document.getElementById('chart-type');
  if (!ctx) return;

  if (state.charts.type) {
    state.charts.type.destroy();
  }

  state.charts.type = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['记录', '警告', '错误'],
      datasets: [{
        data: [counts.record, counts.warning, counts.error],
        backgroundColor: [chartColors.success, chartColors.warning, chartColors.error],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#a0a0b0',
            font: { family: 'Inter' },
            padding: 20
          }
        }
      }
    }
  });
}

// ===== 日志管理 =====
async function loadLogs() {
  try {
    const params = {
      ...state.filters,
      page: state.logs.pagination.page,
      pageSize: state.logs.pagination.pageSize
    };

    const result = await api.getLogs(params);
    state.logs.data = result.data || [];
    state.logs.pagination = result.pagination || { page: 1, pageSize: 20, total: 0 };

    updateLogsTable();
    updateLogsPagination();
  } catch (error) {
    console.error('加载日志失败:', error);
  }
}

function updateLogsTable() {
  const tbody = document.querySelector('#logs-table tbody');
  const logs = state.logs.data;

  if (logs.length === 0) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="9">暂无日志数据</td></tr>';
    return;
  }

  tbody.innerHTML = logs.map(log => `
    <tr data-id="${log.id}" class="clickable-row">
      <td>${log.id}</td>
      <td title="${log.deviceUuid}">${truncateText(log.deviceUuid, 12)}</td>
      <td>${getDataTypeBadge(log.dataType)}</td>
      <td title="${log.key || ''}">${escapeHtml(truncateText(log.key, 15) || '-')}</td>
      <td class="value-preview" title="${escapeHtml(log.value || '')}">${truncateText(log.value, 15)}</td>
      <td>${log.projectId || '-'}</td>
      <td title="${log.sessionUuid || ''}">${truncateText(log.sessionUuid, 10)}</td>
      <td>${escapeHtml(log.clientIp || '-')}</td>
      <td>${formatDate(log.createdAt)}</td>
    </tr>
  `).join('');
}

function updateLogsPagination() {
  const { page, pageSize, total } = state.logs.pagination;
  const totalPages = Math.ceil(total / pageSize);

  // 更新分页信息
  const infoEl = document.getElementById('logs-pagination-info');
  if (infoEl) {
    const start = (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, total);
    infoEl.textContent = total > 0 ? `显示 ${start}-${end}，共 ${total} 条` : '';
  }

  // 更新分页按钮
  const paginationEl = document.getElementById('logs-pagination');
  if (!paginationEl) return;

  let buttons = [];

  // 上一页
  buttons.push(`<button ${page <= 1 ? 'disabled' : ''} data-page="${page - 1}">上一页</button>`);

  // 页码
  const maxButtons = 5;
  let startPage = Math.max(1, page - Math.floor(maxButtons / 2));
  let endPage = Math.min(totalPages, startPage + maxButtons - 1);
  startPage = Math.max(1, endPage - maxButtons + 1);

  for (let i = startPage; i <= endPage; i++) {
    buttons.push(`<button class="${i === page ? 'active' : ''}" data-page="${i}">${i}</button>`);
  }

  // 下一页
  buttons.push(`<button ${page >= totalPages ? 'disabled' : ''} data-page="${page + 1}">下一页</button>`);

  paginationEl.innerHTML = buttons.join('');
}

// ===== 日志详情模态框 =====
async function showLogDetail(logId) {
  const modal = document.getElementById('log-detail-modal');
  const content = document.getElementById('log-detail-content');

  try {
    const log = await api.getLogById(logId);

    content.innerHTML = `
      <div class="detail-grid">
        <span class="detail-label">ID</span>
        <span class="detail-value">${log.id}</span>
        
        <span class="detail-label">设备 UUID</span>
        <span class="detail-value">${log.deviceUuid}</span>
        
        <span class="detail-label">类型</span>
        <span class="detail-value">${getDataTypeBadge(log.dataType)}</span>
        
        <span class="detail-label">Key</span>
        <span class="detail-value">${escapeHtml(log.key || '-')}</span>
        
        <span class="detail-label">项目 ID</span>
        <span class="detail-value">${log.projectId || '-'}</span>
        
        <span class="detail-label">会话 UUID</span>
        <span class="detail-value">${log.sessionUuid || '-'}</span>
        
        <span class="detail-label">客户端 IP</span>
        <span class="detail-value">${escapeHtml(log.clientIp || '-')}</span>

        <span class="detail-label">客户端时间戳</span>
        <span class="detail-value">${log.clientTimestamp || '-'}</span>
        
        <span class="detail-label">服务器时间</span>
        <span class="detail-value">${formatDate(log.createdAt)}</span>
        
        <span class="detail-label">Value</span>
        <pre class="detail-value json">${escapeHtml(log.value || '')}</pre>
      </div>
      <div class="modal-actions">
        <button class="btn btn-danger" onclick="deleteLogConfirm(${log.id})">删除此日志</button>
      </div>
    `;

    modal.classList.add('active');
  } catch (error) {
    console.error('获取日志详情失败:', error);
    content.innerHTML = '<p>获取日志详情失败</p>';
    modal.classList.add('active');
  }
}

async function deleteLogConfirm(logId) {
  if (!confirm('确定要删除这条日志吗？此操作不可恢复。')) {
    return;
  }
  
  try {
    const success = await api.deleteLog(logId);
    if (success) {
      closeModal();
      loadLogs();
      if (state.currentPage === 'dashboard') {
        loadDashboard();
      }
    } else {
      alert('删除失败');
    }
  } catch (error) {
    console.error('删除日志失败:', error);
    alert('删除失败: ' + (error.message || '未知错误'));
  }
}

function closeModal() {
  document.querySelectorAll('.modal').forEach(modal => {
    modal.classList.remove('active');
  });
}

// ===== 报表功能 =====
async function loadDeviceReport(uuid) {
  try {
    const report = await api.getDeviceReport(uuid);

    document.getElementById('device-total-logs').textContent = report.totalLogs || 0;
    document.getElementById('device-record-count').textContent = report.typeCounts?.record || 0;
    document.getElementById('device-warning-count').textContent = report.typeCounts?.warning || 0;
    document.getElementById('device-error-count').textContent = report.typeCounts?.error || 0;

    // 更新图表
    const ctx = document.getElementById('chart-device-type');
    if (state.charts.deviceType) {
      state.charts.deviceType.destroy();
    }

    state.charts.deviceType = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['记录', '警告', '错误'],
        datasets: [{
          label: '数量',
          data: [
            report.typeCounts?.record || 0,
            report.typeCounts?.warning || 0,
            report.typeCounts?.error || 0
          ],
          backgroundColor: [chartColors.success, chartColors.warning, chartColors.error]
        }]
      },
      options: {
        ...chartDefaultOptions,
        plugins: { legend: { display: false } }
      }
    });

    document.getElementById('device-report-result').style.display = 'block';
  } catch (error) {
    console.error('加载设备报表失败:', error);
    alert('加载设备报表失败: ' + (error.message || '未知错误'));
  }
}

async function loadTimeRangeReport(startTime, endTime) {
  try {
    const report = await api.getTimeRangeReport(startTime, endTime);

    document.getElementById('time-total-logs').textContent = report.totalLogs || 0;
    document.getElementById('time-device-count').textContent = report.deviceCount || 0;

    // 更新图表
    const ctx = document.getElementById('chart-time-type');
    if (state.charts.timeType) {
      state.charts.timeType.destroy();
    }

    state.charts.timeType = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: ['记录', '警告', '错误'],
        datasets: [{
          data: [
            report.typeCounts?.record || 0,
            report.typeCounts?.warning || 0,
            report.typeCounts?.error || 0
          ],
          backgroundColor: [chartColors.success, chartColors.warning, chartColors.error],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#a0a0b0', font: { family: 'Inter' } }
          }
        }
      }
    });

    document.getElementById('time-report-result').style.display = 'block';
  } catch (error) {
    console.error('加载时间段报表失败:', error);
    alert('加载时间段报表失败: ' + (error.message || '未知错误'));
  }
}

async function loadErrorReport() {
  try {
    const report = await api.getErrorReport();

    document.getElementById('error-total').textContent = report.totalErrors || 0;

    const tbody = document.querySelector('#error-table tbody');
    const errors = report.errors || [];

    if (errors.length === 0) {
      tbody.innerHTML = '<tr class="empty-row"><td colspan="9">暂无错误日志</td></tr>';
    } else {
      tbody.innerHTML = errors.map(err => `
        <tr>
          <td>${err.id}</td>
          <td title="${err.deviceUuid}">${truncateText(err.deviceUuid, 12)}</td>
          <td>${getDataTypeBadge(err.dataType)}</td>
          <td title="${err.key || ''}">${escapeHtml(truncateText(err.key, 15) || '-')}</td>
          <td class="value-preview" title="${escapeHtml(err.value || '')}">${truncateText(err.value, 15)}</td>
          <td>${err.projectId || '-'}</td>
          <td title="${err.sessionUuid || ''}">${truncateText(err.sessionUuid, 10)}</td>
          <td>${escapeHtml(err.clientIp || '-')}</td>
          <td>${formatDate(err.createdAt)}</td>
        </tr>
      `).join('');
    }

    document.getElementById('error-report-result').style.display = 'block';
  } catch (error) {
    console.error('加载错误报表失败:', error);
    alert('加载错误报表失败: ' + (error.message || '未知错误'));
  }
}

// ===== 健康检查 =====
async function checkHealth() {
  const healthEl = document.getElementById('health-status');
  try {
    const health = await api.getHealth();
    healthEl.classList.remove('unhealthy');
    healthEl.classList.add('healthy');
    healthEl.querySelector('.status-text').textContent = health.status === 'ok' ? '系统正常' : '系统降级';
  } catch {
    healthEl.classList.remove('healthy');
    healthEl.classList.add('unhealthy');
    healthEl.querySelector('.status-text').textContent = '连接失败';
  }
}

// ===== 事件绑定 =====
function bindEvents() {
  // 导航点击
  document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo(item.dataset.page);
    });
  });

  // 卡片查看全部链接
  document.querySelectorAll('.btn-link[data-page]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo(btn.dataset.page);
    });
  });

  // 日志过滤表单
  const filterForm = document.getElementById('log-filter-form');
  if (filterForm) {
    filterForm.addEventListener('submit', (e) => {
      e.preventDefault();
      state.filters = {
        deviceUuid: document.getElementById('filter-device-uuid').value,
        dataType: document.getElementById('filter-data-type').value,
        projectId: document.getElementById('filter-project-id').value || undefined,
        sessionUuid: document.getElementById('filter-session-uuid').value,
        key: document.getElementById('filter-key').value,
        startTime: document.getElementById('filter-start-time').value || undefined,
        endTime: document.getElementById('filter-end-time').value || undefined
      };
      state.logs.pagination.page = 1;
      loadLogs();
    });

    filterForm.addEventListener('reset', () => {
      state.filters = {};
      state.logs.pagination.page = 1;
      setTimeout(loadLogs, 0);
    });
  }

  // 分页点击
  document.getElementById('logs-pagination')?.addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON' && !e.target.disabled) {
      state.logs.pagination.page = parseInt(e.target.dataset.page);
      loadLogs();
    }
  });

  // 表格行点击 - 显示详情
  document.addEventListener('click', (e) => {
    const row = e.target.closest('.clickable-row');
    if (row && row.dataset.id) {
      showLogDetail(row.dataset.id);
    }
  });

  // 模态框关闭
  document.querySelectorAll('.modal-close, .modal-backdrop').forEach(el => {
    el.addEventListener('click', closeModal);
  });

  // ESC 关闭模态框
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  // 报表标签切换
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.dataset.tab;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`tab-${tabId}`).classList.add('active');
    });
  });

  // 设备报表表单
  document.getElementById('device-report-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const uuid = document.getElementById('report-device-uuid').value;
    loadDeviceReport(uuid);
  });

  // 时间段报表表单
  document.getElementById('time-report-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const startTime = new Date(document.getElementById('report-start-time').value).toISOString();
    const endTime = new Date(document.getElementById('report-end-time').value).toISOString();
    loadTimeRangeReport(startTime, endTime);
  });

  // 错误报表按钮
  document.getElementById('btn-load-error-report')?.addEventListener('click', loadErrorReport);

  // 全局搜索
  const globalSearch = document.getElementById('global-search');
  if (globalSearch) {
    globalSearch.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const query = globalSearch.value.trim();
        if (query) {
          state.filters = { key: query };
          state.logs.pagination.page = 1;
          navigateTo('logs');
        }
      }
    });
  }

  // 登出点击
  document.getElementById('btn-logout')?.addEventListener('click', (e) => {
    e.preventDefault();
    // 移除 confirm 以解决某些浏览器/环境下确认框“闪退”的问题
    auth.clear();
    showLoginPage();
  });

  // 登录表单提交
  document.getElementById('login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');
    const submitBtn = e.target.querySelector('button');

    try {
      errorEl.classList.remove('active');
      submitBtn.disabled = true;
      submitBtn.textContent = '验证中...';

      const result = await api.login(password);
      auth.setToken(result.token);
      auth.setUser(result.user);

      hideLoginPage();
    } catch (error) {
      errorEl.classList.add('active');
      errorEl.textContent = '密码错误';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = '进入系统';
    }
  });

  // Hash 路由
  window.addEventListener('hashchange', () => {
    const page = window.location.hash.slice(1) || 'dashboard';
    if (['dashboard', 'logs', 'reports'].includes(page)) {
      navigateTo(page);
    }
  });
}

// ===== 初始化 =====
document.addEventListener('DOMContentLoaded', async () => {
  bindEvents();

  // 检查登录状态
  const token = auth.getToken();
  if (token) {
    const isValid = await api.verifyToken();
    if (isValid) {
      hideLoginPage();

      // 初始页面
      const initialPage = window.location.hash.slice(1) || 'dashboard';
      navigateTo(['dashboard', 'logs', 'reports'].includes(initialPage) ? initialPage : 'dashboard');
    } else {
      auth.clear();
      showLoginPage();
    }
  } else {
    showLoginPage();
  }

  // 健康检查
  checkHealth();
  setInterval(checkHealth, 30000); // 每30秒检查一次
});
