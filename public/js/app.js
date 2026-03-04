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

  // 创建日志
  async createLog(logData) {
    const res = await fetch(`${API_BASE}/logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...auth.getHeaders()
      },
      body: JSON.stringify(logData)
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error?.message || '创建日志失败');
    }
    return res.json();
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
  },

  // 项目管理相关
  async getAllProjects() {
    const res = await fetch(`${API_BASE}/projects`);
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error?.message || '获取项目列表失败');
    }
    return res.json();
  },

  async getProjectById(id) {
    const res = await fetch(`${API_BASE}/projects/${id}`, {
      headers: auth.getHeaders()
    });
    if (res.status === 401) handleUnauthorized();
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error?.message || '获取项目信息失败');
    }
    return res.json();
  },

  async createProject(projectData) {
    const res = await fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: auth.getHeaders(),
      body: JSON.stringify(projectData)
    });
    if (res.status === 401) handleUnauthorized();
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error?.message || '创建项目失败');
    }
    return res.json();
  },

  async updateProject(id, projectData) {
    const res = await fetch(`${API_BASE}/projects/${id}`, {
      method: 'PUT',
      headers: auth.getHeaders(),
      body: JSON.stringify(projectData)
    });
    if (res.status === 401) handleUnauthorized();
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error?.message || '更新项目失败');
    }
    return res.json();
  },

  async deleteProject(id) {
    const res = await fetch(`${API_BASE}/projects/${id}`, {
      method: 'DELETE',
      headers: auth.getHeaders()
    });
    if (res.status === 401) handleUnauthorized();
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error?.message || '删除项目失败');
    }
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
  charts: {},
  projects: {
    data: [],
    currentProject: null,
    isEditing: false
  }
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
    case 'projects':
      loadProjects();
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
        <span class="detail-label">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 12l2 2 4-4"/>
            <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"/>
            <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"/>
            <path d="M3 12h6m6 0h6"/>
          </svg>
          ID
        </span>
        <span class="detail-value">${log.id}</span>
        
        <span class="detail-label">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
            <line x1="8" y1="21" x2="16" y2="21"/>
            <line x1="12" y1="17" x2="12" y2="21"/>
          </svg>
          设备 UUID
        </span>
        <span class="detail-value">${log.deviceUuid}</span>
        
        <span class="detail-label">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
            <polyline points="14,2 14,8 20,8"/>
          </svg>
          类型
        </span>
        <span class="detail-value">${getDataTypeBadge(log.dataType)}</span>
        
        <span class="detail-label">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <circle cx="12" cy="16" r="1"/>
            <path d="M7 11V7a5 5 0 0110 0v4"/>
          </svg>
          Key
        </span>
        <span class="detail-value">${escapeHtml(log.key || '-')}</span>
        
        <span class="detail-label">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
          </svg>
          项目 ID
        </span>
        <span class="detail-value">${log.projectId || '-'}</span>
        
        <span class="detail-label">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
          </svg>
          会话 UUID
        </span>
        <span class="detail-value">${log.sessionUuid || '-'}</span>
        
        <span class="detail-label">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="2" y1="12" x2="22" y2="12"/>
            <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
          </svg>
          客户端 IP
        </span>
        <span class="detail-value">${escapeHtml(log.clientIp || '-')}</span>

        <span class="detail-label">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12,6 12,12 16,14"/>
          </svg>
          客户端时间戳
        </span>
        <span class="detail-value">${log.clientTimestamp || '-'}</span>
        
        <span class="detail-label">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12,6 12,12 16,14"/>
          </svg>
          服务器时间
        </span>
        <span class="detail-value">${formatDate(log.createdAt)}</span>
        
        <span class="detail-label">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="16 18 22 12 16 6"/>
            <polyline points="8 6 2 12 8 18"/>
          </svg>
          Value
        </span>
        <pre class="detail-value json">${escapeHtml(log.value || '')}</pre>
      </div>
      <div class="enhanced-modal-actions">
        <button class="btn btn-danger" onclick="deleteLogConfirm(${log.id})">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3,6 5,6 21,6"/>
            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
            <line x1="10" y1="11" x2="10" y2="17"/>
            <line x1="14" y1="11" x2="14" y2="17"/>
          </svg>
          删除此日志
        </button>
      </div>
    `;

    modal.classList.add('active');
  } catch (error) {
    console.error('获取日志详情失败:', error);
    content.innerHTML = `
      <div style="padding: 2rem; text-align: center; color: #6c757d;">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-bottom: 1rem; opacity: 0.5;">
          <circle cx="12" cy="12" r="10"/>
          <line x1="15" y1="9" x2="9" y2="15"/>
          <line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
        <p>获取日志详情失败</p>
      </div>
    `;
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

// ===== 项目管理 =====
async function loadProjects() {
  const loadingEl = document.getElementById('projects-loading');
  const containerEl = document.getElementById('projects-container');
  const emptyEl = document.getElementById('projects-empty');

  try {
    loadingEl.style.display = 'block';
    containerEl.style.display = 'none';
    emptyEl.style.display = 'none';

    const response = await api.getAllProjects();
    state.projects.data = response.data || [];

    updateProjectsTable();
    updateProjectsStats();
  } catch (error) {
    console.error('加载项目列表失败:', error);
    showProjectError(`加载项目列表失败: ${error.message}`);
    emptyEl.style.display = 'block';
  } finally {
    loadingEl.style.display = 'none';
  }
}

function updateProjectsTable() {
  const tbody = document.getElementById('projects-tbody');
  const containerEl = document.getElementById('projects-container');
  const emptyEl = document.getElementById('projects-empty');
  const projects = state.projects.data;

  if (!projects || projects.length === 0) {
    containerEl.style.display = 'none';
    emptyEl.style.display = 'block';
    return;
  }

  containerEl.style.display = 'block';
  emptyEl.style.display = 'none';

  tbody.innerHTML = projects.map(project => `
    <tr>
      <td><strong>${project.id}</strong></td>
      <td>
        <div style="font-weight: 600;">${escapeHtml(project.name)}</div>
        <small style="color: #6c757d;">${escapeHtml(project.uuid)}</small>
      </td>
      <td>
        <code style="font-size: 0.875rem; background: #f8f9fa; padding: 0.25rem 0.5rem; border-radius: 4px;">${escapeHtml(project.uuid)}</code>
      </td>
      <td>
        ${project.hasPassword
      ? '<span class="badge badge-warning">🔒 受保护</span>'
      : '<span class="badge badge-record">✓ 公开</span>'
    }
      </td>
      <td>
        <div style="max-width: 200px; max-height: 80px; overflow-y: auto; font-size: 0.875rem;">
          ${renderColumnMapping(project.columnMapping)}
        </div>
      </td>
      <td>
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
          <a href="/session.html?projectId=${project.id}" target="_blank" class="btn btn-sm" style="background: #0d6efd; color: white; padding: 0.25rem 0.5rem; font-size: 0.75rem; text-decoration: none; display: inline-flex; align-items: center; gap: 0.25rem;" title="查看日志">
            📊 日志
          </a>
          <button class="btn btn-sm" style="background: #ffc107; color: #000; padding: 0.25rem 0.5rem; font-size: 0.75rem;" onclick="editProject(${project.id})" title="编辑">
            ✏️
          </button>
          <button class="btn btn-sm" style="background: #dc3545; color: white; padding: 0.25rem 0.5rem; font-size: 0.75rem;" onclick="confirmDeleteProject(${project.id}, '${escapeHtml(project.name)}')" title="删除">
            🗑️
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

function renderColumnMapping(mapping) {
  if (!mapping || Object.keys(mapping).length === 0) {
    return '<span style="color: #6c757d;">无映射</span>';
  }

  return Object.entries(mapping).map(([key, value]) => `
    <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
      <span style="font-weight: 500; color: #0d6efd;">${escapeHtml(key)}</span>
      <span style="color: #212529;">${escapeHtml(value)}</span>
    </div>
  `).join('');
}

function updateProjectsStats() {
  const projects = state.projects.data;
  const totalProjects = projects.length;
  const protectedProjects = projects.filter(p => p.hasPassword).length;

  document.getElementById('total-projects').textContent = totalProjects;
  document.getElementById('protected-projects').textContent = protectedProjects;
}

function showProjectError(message) {
  // 创建错误提示
  const errorDiv = document.createElement('div');
  errorDiv.className = 'alert alert-danger';
  errorDiv.style.cssText = 'background: rgba(220, 53, 69, 0.1); color: #dc3545; padding: 1rem; border-radius: 10px; margin-bottom: 1rem;';
  errorDiv.textContent = message;

  // 插入到项目管理页面顶部
  const pageContent = document.getElementById('page-projects');
  const pageHeader = pageContent.querySelector('.page-header');
  pageContent.insertBefore(errorDiv, pageHeader.nextSibling);

  // 5秒后自动消失
  setTimeout(() => {
    if (errorDiv.parentNode) {
      errorDiv.remove();
    }
  }, 5000);
}

function showProjectSuccess(message) {
  // 创建成功提示
  const successDiv = document.createElement('div');
  successDiv.className = 'alert alert-success';
  successDiv.style.cssText = 'background: rgba(25, 135, 84, 0.1); color: #198754; padding: 1rem; border-radius: 10px; margin-bottom: 1rem;';
  successDiv.textContent = message;

  // 插入到项目管理页面顶部
  const pageContent = document.getElementById('page-projects');
  const pageHeader = pageContent.querySelector('.page-header');
  pageContent.insertBefore(successDiv, pageHeader.nextSibling);

  // 3秒后自动消失
  setTimeout(() => {
    if (successDiv.parentNode) {
      successDiv.remove();
    }
  }, 3000);
}

function openCreateProjectModal() {
  state.projects.isEditing = false;
  state.projects.currentProject = null;

  document.getElementById('project-modal-title').textContent = '新建项目';
  document.querySelector('.modal-subtitle').textContent = '创建一个新的硬件日志项目';
  document.getElementById('project-id').value = '';
  document.getElementById('project-id').disabled = false;
  document.getElementById('project-uuid').value = '';
  document.getElementById('project-name').value = '';
  document.getElementById('project-password').value = '';
  document.getElementById('project-column-mapping').value = JSON.stringify({
    "temperature": "温度",
    "humidity": "湿度",
    "pressure": "压力",
    "battery": "电池"
  }, null, 2);

  // 重置自动导入区域
  const verseIdInput = document.getElementById('verse-id-input');
  if (verseIdInput) {
    verseIdInput.value = '';
  }
  const autoImportStatus = document.getElementById('auto-import-status');
  if (autoImportStatus) {
    autoImportStatus.style.display = 'none';
    autoImportStatus.textContent = '';
  }

  document.getElementById('project-form-error').textContent = '';
  document.getElementById('project-form-error').classList.remove('active');
  document.getElementById('project-modal').classList.add('active');
}

// 自动导入项目信息
async function fetchProjectFromVerse() {
  const verseIdInput = document.getElementById('verse-id-input');
  const statusEl = document.getElementById('auto-import-status');
  const importBtn = document.getElementById('btn-auto-import');

  const verseId = verseIdInput.value.trim();

  if (!verseId) {
    showAutoImportStatus('请输入 Verse ID', 'warning');
    return;
  }

  try {
    importBtn.disabled = true;
    importBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px; animation: spin 1s linear infinite;">
        <path d="M21 12a9 9 0 11-6.219-8.56" />
      </svg>
      导入中...
    `;
    showAutoImportStatus('正在从服务器获取项目信息...', 'info');

    const response = await fetch(`https://a1.bupingfan.com/v1/server/snapshot?verse_id=${verseId}&expand=verse_id,name,uuid`);

    if (!response.ok) {
      throw new Error(`请求失败: ${response.status}`);
    }

    const data = await response.json();

    // 填充表单字段
    // verse_id 作为 projectId
    document.getElementById('project-id').value = data.verse_id || '';
    // name 作为项目名称
    document.getElementById('project-name').value = data.name || '';
    // uuid 作为 uuid
    document.getElementById('project-uuid').value = data.uuid || '';

    showAutoImportStatus(`成功导入项目信息: ${data.name || 'N/A'}`, 'success');
  } catch (error) {
    console.error('自动导入失败:', error);
    showAutoImportStatus(`导入失败: ${error.message}`, 'error');
  } finally {
    importBtn.disabled = false;
    importBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      自动导入
    `;
  }
}

function showAutoImportStatus(message, type) {
  const statusEl = document.getElementById('auto-import-status');
  if (!statusEl) return;

  statusEl.style.display = 'block';
  statusEl.textContent = message;

  // 根据类型设置样式
  const styles = {
    success: { background: 'rgba(25, 135, 84, 0.1)', color: '#198754' },
    error: { background: 'rgba(220, 53, 69, 0.1)', color: '#dc3545' },
    warning: { background: 'rgba(255, 193, 7, 0.1)', color: '#b45309' },
    info: { background: 'rgba(13, 110, 253, 0.1)', color: '#0d6efd' }
  };

  const style = styles[type] || styles.info;
  statusEl.style.backgroundColor = style.background;
  statusEl.style.color = style.color;
}

async function editProject(id) {
  try {
    state.projects.isEditing = true;
    state.projects.currentProject = state.projects.data.find(p => p.id === id);

    if (!state.projects.currentProject) {
      throw new Error('项目不存在');
    }

    document.getElementById('project-modal-title').textContent = '编辑项目';
    document.querySelector('.modal-subtitle').textContent = `编辑项目：${state.projects.currentProject.name}`;
    document.getElementById('project-id').value = state.projects.currentProject.id;
    document.getElementById('project-id').disabled = true; // 编辑时不可修改ID
    document.getElementById('project-uuid').value = state.projects.currentProject.uuid;
    document.getElementById('project-name').value = state.projects.currentProject.name;
    document.getElementById('project-password').value = ''; // 不显示现有密码
    document.getElementById('project-column-mapping').value = JSON.stringify(state.projects.currentProject.columnMapping || {}, null, 2);

    document.getElementById('project-form-error').textContent = '';
    document.getElementById('project-form-error').classList.remove('active');
    document.getElementById('project-modal').classList.add('active');
  } catch (error) {
    showProjectError(`编辑项目失败: ${error.message}`);
  }
}

async function saveProject() {
  const form = document.getElementById('project-form');
  const submitBtn = form.querySelector('button[type="submit"]');
  const errorEl = document.getElementById('project-form-error');
  const originalText = submitBtn.textContent;

  try {
    submitBtn.disabled = true;
    submitBtn.textContent = '保存中...';
    errorEl.textContent = '';
    errorEl.classList.remove('active');

    const projectIdStr = document.getElementById('project-id').value.trim();
    const uuid = document.getElementById('project-uuid').value.trim();
    const name = document.getElementById('project-name').value.trim();
    const password = document.getElementById('project-password').value.trim();
    const columnMappingText = document.getElementById('project-column-mapping').value.trim();

    // 验证输入
    if (!uuid || !name) {
      throw new Error('项目UUID和名称不能为空');
    }

    let columnMapping = {};
    if (columnMappingText) {
      try {
        columnMapping = JSON.parse(columnMappingText);
      } catch (e) {
        throw new Error('列名映射格式错误，请输入有效的JSON格式');
      }
    }

    const projectData = {
      uuid,
      name,
      password: password || null,
      columnMapping: Object.keys(columnMapping).length > 0 ? columnMapping : null
    };

    if (projectIdStr && !state.projects.isEditing) {
      projectData.id = parseInt(projectIdStr, 10);
    }

    if (state.projects.isEditing && state.projects.currentProject) {
      await api.updateProject(state.projects.currentProject.id, projectData);
      showProjectSuccess('项目更新成功');
    } else {
      await api.createProject(projectData);
      showProjectSuccess('项目创建成功');
    }

    // 关闭模态框并刷新列表
    closeModal();
    await loadProjects();
  } catch (error) {
    errorEl.classList.add('active');
    errorEl.textContent = `保存项目失败: ${error.message}`;
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
}

function confirmDeleteProject(id, name) {
  if (confirm(`确定要删除项目"${name}"吗？\n\n此操作不可撤销，请谨慎操作。`)) {
    deleteProjectById(id);
  }
}

async function deleteProjectById(id) {
  try {
    await api.deleteProject(id);
    showProjectSuccess('项目删除成功');
    await loadProjects();
  } catch (error) {
    showProjectError(`删除项目失败: ${error.message}`);
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
      const page = item.dataset.page;
      // 更新URL hash
      window.location.hash = page;
      navigateTo(page);
    });
  });

  // 卡片查看全部链接
  document.querySelectorAll('.btn-link[data-page]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const page = btn.dataset.page;
      // 更新URL hash
      window.location.hash = page;
      navigateTo(page);
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
  document.addEventListener('click', (e) => {
    // 关闭按钮点击
    if (e.target.classList.contains('modal-close')) {
      closeModal();
    }
    // 点击模态框外部关闭
    if (e.target.classList.contains('modal')) {
      closeModal();
    }
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

  // 添加日志按钮点击
  document.getElementById('btn-add-log')?.addEventListener('click', () => {
    document.getElementById('add-log-modal').classList.add('active');
    document.getElementById('add-log-error').textContent = '';
    document.getElementById('add-log-form').reset();
  });

  // 添加日志表单提交
  document.getElementById('add-log-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('add-log-error');
    const submitBtn = e.target.querySelector('button[type="submit"]');

    const logData = {
      deviceUuid: document.getElementById('add-device-uuid').value.trim(),
      sessionUuid: document.getElementById('add-session-uuid').value.trim(),
      projectId: parseInt(document.getElementById('add-project-id').value, 10),
      dataType: document.getElementById('add-data-type').value,
      key: document.getElementById('add-key').value.trim(),
      value: document.getElementById('add-value').value.trim(),
      timestamp: document.getElementById('add-timestamp').value
        ? parseInt(document.getElementById('add-timestamp').value, 10)
        : Date.now(),
      clientIp: document.getElementById('add-client-ip').value.trim() || undefined
    };

    try {
      errorEl.textContent = '';
      errorEl.classList.remove('active');
      submitBtn.disabled = true;
      submitBtn.textContent = '添加中...';

      await api.createLog(logData);

      closeModal();
      // 刷新日志列表
      if (state.currentPage === 'logs') {
        loadLogs();
      } else if (state.currentPage === 'dashboard') {
        loadDashboard();
      }
    } catch (error) {
      errorEl.classList.add('active');
      errorEl.textContent = error.message || '添加日志失败';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = '添加日志';
    }
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
    if (['dashboard', 'logs', 'projects', 'reports'].includes(page)) {
      navigateTo(page);
    }
  });

  // 项目管理事件
  document.getElementById('btn-add-project')?.addEventListener('click', openCreateProjectModal);
  document.getElementById('btn-refresh-projects')?.addEventListener('click', loadProjects);
  document.getElementById('btn-auto-import')?.addEventListener('click', fetchProjectFromVerse);

  // 项目表单提交
  document.getElementById('project-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveProject();
  });

  // 项目表单回车键提交
  document.getElementById('project-form')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault();
      saveProject();
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
      navigateTo(['dashboard', 'logs', 'projects', 'reports'].includes(initialPage) ? initialPage : 'dashboard');
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
