/**
 * 会话日志查看器 - 前端逻辑
 */

const API_BASE = '/api/v1';

// 工具函数
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

// API 调用
async function getSessionsByProject(projectId) {
  const res = await fetch(`${API_BASE}/sessions/project/${projectId}`);
  if (!res.ok) throw new Error('获取会话列表失败');
  return res.json();
}

async function getSessionDetail(sessionUuid) {
  const res = await fetch(`${API_BASE}/sessions/${encodeURIComponent(sessionUuid)}`);
  if (!res.ok) throw new Error('获取会话详情失败');
  return res.json();
}

// 状态管理
const state = {
  currentProjectId: null,
  currentSessionUuid: null,
  sessions: [],
  sessionDetail: null
};

// 加载会话列表
async function loadSessions() {
  const projectIdInput = document.getElementById('project-id-input');
  const projectId = parseInt(projectIdInput.value, 10);
  
  if (!projectId || projectId < 0) {
    alert('请输入有效的项目 ID');
    return;
  }

  const loadingEl = document.getElementById('sessions-loading');
  const sessionsListEl = document.getElementById('sessions-list');
  const sessionsSectionEl = document.getElementById('sessions-section');

  try {
    loadingEl.style.display = 'block';
    sessionsListEl.innerHTML = '';
    
    const data = await getSessionsByProject(projectId);
    state.currentProjectId = projectId;
    state.sessions = data.sessions || [];

    loadingEl.style.display = 'none';
    sessionsSectionEl.style.display = 'block';

    if (state.sessions.length === 0) {
      sessionsListEl.innerHTML = '<p class="empty-message">该项目暂无会话记录</p>';
      return;
    }

    // 渲染会话列表
    sessionsListEl.innerHTML = state.sessions.map(session => `
      <div class="session-card" data-session-uuid="${session.sessionUuid}">
        <div class="session-card-header">
          <h3>${escapeHtml(session.sessionUuid)}</h3>
          <span class="session-count">${session.logCount} 条日志</span>
        </div>
        <div class="session-card-body">
          <div class="session-info">
            <span><strong>设备:</strong> ${escapeHtml(session.deviceUuid || '-')}</span>
            <span><strong>记录:</strong> ${session.recordCount}</span>
            <span><strong>警告:</strong> ${session.warningCount}</span>
            <span><strong>错误:</strong> ${session.errorCount}</span>
          </div>
          <div class="session-time">
            <span><strong>首次:</strong> ${formatDate(session.firstLogTime)}</span>
            <span><strong>最后:</strong> ${formatDate(session.lastLogTime)}</span>
          </div>
        </div>
        <button class="btn btn-primary btn-sm view-session-btn" data-session-uuid="${session.sessionUuid}">
          查看详情
        </button>
      </div>
    `).join('');

    // 绑定查看详情按钮
    document.querySelectorAll('.view-session-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const sessionUuid = btn.dataset.sessionUuid;
        loadSessionDetail(sessionUuid);
      });
    });

  } catch (error) {
    loadingEl.style.display = 'none';
    alert('加载会话列表失败: ' + error.message);
    console.error(error);
  }
}

// 加载会话详情
async function loadSessionDetail(sessionUuid) {
  const detailSectionEl = document.getElementById('session-detail-section');
  const summaryEl = document.getElementById('session-summary');
  const tableBody = document.querySelector('#session-logs-table tbody');

  try {
    const data = await getSessionDetail(sessionUuid);
    state.currentSessionUuid = sessionUuid;
    state.sessionDetail = data;

    // 显示详情区域
    detailSectionEl.style.display = 'block';
    detailSectionEl.scrollIntoView({ behavior: 'smooth' });

    // 渲染汇总信息
    summaryEl.innerHTML = `
      <div class="summary-grid">
        <div class="summary-item">
          <span class="summary-label">会话 UUID</span>
          <span class="summary-value">${escapeHtml(data.sessionUuid)}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">项目 ID</span>
          <span class="summary-value">${data.projectId}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">设备 UUID</span>
          <span class="summary-value">${escapeHtml(data.deviceUuid || '-')}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">总日志数</span>
          <span class="summary-value">${data.totalLogs}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">记录</span>
          <span class="summary-value badge-record">${data.recordCount}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">警告</span>
          <span class="summary-value badge-warning">${data.warningCount}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">错误</span>
          <span class="summary-value badge-error">${data.errorCount}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">首次记录</span>
          <span class="summary-value">${formatDate(data.firstLogTime)}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">最后记录</span>
          <span class="summary-value">${formatDate(data.lastLogTime)}</span>
        </div>
      </div>
    `;

    // 渲染日志表格
    const logs = data.logs || [];
    if (logs.length === 0) {
      tableBody.innerHTML = '<tr class="empty-row"><td colspan="7">暂无日志数据</td></tr>';
      return;
    }

    tableBody.innerHTML = logs.map(log => `
      <tr>
        <td>${log.id}</td>
        <td>${getDataTypeBadge(log.dataType)}</td>
        <td title="${escapeHtml(log.key || '')}">${escapeHtml(truncateText(log.key, 20) || '-')}</td>
        <td class="value-preview" title="${escapeHtml(log.value || '')}">${truncateText(log.value, 30)}</td>
        <td title="${log.deviceUuid}">${truncateText(log.deviceUuid, 15)}</td>
        <td>${escapeHtml(log.clientIp || '-')}</td>
        <td>${formatDate(log.createdAt)}</td>
      </tr>
    `).join('');

  } catch (error) {
    alert('加载会话详情失败: ' + error.message);
    console.error(error);
  }
}

// 返回会话列表
function backToSessions() {
  document.getElementById('session-detail-section').style.display = 'none';
  document.getElementById('sessions-section').scrollIntoView({ behavior: 'smooth' });
}

// 事件绑定
document.addEventListener('DOMContentLoaded', () => {
  // 加载会话列表按钮
  document.getElementById('load-sessions-btn').addEventListener('click', loadSessions);

  // 项目ID输入框回车
  document.getElementById('project-id-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      loadSessions();
    }
  });

  // 返回会话列表按钮
  document.getElementById('back-to-sessions-btn').addEventListener('click', backToSessions);
});
