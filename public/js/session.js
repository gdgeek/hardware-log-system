/**
 * 项目整理报表 - 前端逻辑
 */

const API_BASE = '/api/v1';

// 工具函数 - 获取URL参数
function getUrlParameter(name) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}

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

// API 调用
async function getProjectOrganizationReport(projectId, startDate, endDate) {
  const res = await fetch(`${API_BASE}/sessions/reports/project-organization?projectId=${projectId}&startDate=${startDate}&endDate=${endDate}`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error?.message || '获取项目整理报表失败');
  }
  return res.json();
}

// 获取按天分组的项目整理报表
async function getProjectOrganizationReportByDays(projectId, startDate, endDate) {
  const res = await fetch(`${API_BASE}/sessions/reports/project-organization-by-days?projectId=${projectId}&startDate=${startDate}&endDate=${endDate}`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error?.message || '获取项目整理报表失败');
  }
  return res.json();
}

// 获取项目信息
async function getProjectInfo(projectId) {
  try {
    // 直接从公开的项目列表中查找项目信息
    const listRes = await fetch(`${API_BASE}/projects`);
    if (listRes.ok) {
      const listResult = await listRes.json();
      const projects = listResult.success ? listResult.data : listResult;
      const project = projects.find(p => p.id === parseInt(projectId, 10));
      return project || null;
    }
    return null;
  } catch (error) {
    console.warn('获取项目信息失败:', error);
    return null;
  }
}

// 项目认证
async function authenticateProject(projectId, password) {
  const res = await fetch(`${API_BASE}/projects/auth`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      projectId: parseInt(projectId, 10),
      password: password || '',
    }),
  });

  const result = await res.json();
  return result;
}

// 更新页面标题显示项目信息
async function updateProjectInfo(projectId) {
  const projectInfoEl = document.getElementById('project-info');
  
  try {
    const project = await getProjectInfo(projectId);
    if (project) {
      projectInfoEl.innerHTML = `
        <strong>项目：${project.name}</strong> (ID: ${project.id})
        <br>
        <small>查看项目中会话和数据的矩阵报表，支持Excel导出</small>
      `;
      return true; // 项目存在
    } else {
      projectInfoEl.innerHTML = `
        <strong>项目 ID: ${projectId}</strong>
        <br>
        <small>查看项目中会话和数据的矩阵报表，支持Excel导出</small>
      `;
      return false; // 项目不存在
    }
  } catch (error) {
    console.warn('获取项目信息失败:', error);
    projectInfoEl.innerHTML = `
      <strong>项目 ID: ${projectId}</strong>
      <br>
      <small>查看项目中会话和数据的矩阵报表，支持Excel导出</small>
    `;
    return false; // 获取失败，视为不存在
  }
}
// 状态管理
const state = {
  organizationReport: null,
  dailyReports: null,
  combinedReport: null,
  currentProject: null,
  isAuthenticated: false
};

// 初始化项目整理报表
async function initOrganizationReport() {
  // 检查URL参数中是否有projectId
  const urlProjectId = getUrlParameter('projectId');
  const projectIdInput = document.getElementById('org-project-id');

  if (urlProjectId && !isNaN(parseInt(urlProjectId, 10))) {
    // 如果URL中有有效的projectId参数，隐藏项目ID输入框并重新布局
    const projectId = parseInt(urlProjectId, 10);
    
    // 隐藏整个项目ID输入列
    const projectIdColumn = projectIdInput.closest('.col-md-3');
    if (projectIdColumn) {
      projectIdColumn.style.display = 'none';
    }
    
    // 重新调整布局 - 让日期列占用更多空间
    const startDateColumn = document.getElementById('org-start-date').closest('.col-md-3');
    const endDateColumn = document.getElementById('org-end-date').closest('.col-md-3');
    const buttonColumn = document.getElementById('generate-organization-btn').closest('.col-md-3');
    
    if (startDateColumn && endDateColumn && buttonColumn) {
      // 调整为更均匀的布局：开始日期(4列) + 结束日期(4列) + 按钮(4列)
      startDateColumn.className = startDateColumn.className.replace('col-md-3', 'col-md-4');
      endDateColumn.className = endDateColumn.className.replace('col-md-3', 'col-md-4');
      buttonColumn.className = buttonColumn.className.replace('col-md-3', 'col-md-4');
    }
    
    // 更新项目信息显示并检查项目是否存在
    const projectExists = await updateProjectInfo(projectId);
    
    // 如果项目不存在，显示错误并准备重定向
    if (!projectExists) {
      showError('项目不存在', '错误：', 5000);
      
      // 5秒后删除projectId参数并重定向到正常页面
      setTimeout(() => {
        const url = new URL(window.location.href);
        url.searchParams.delete('projectId');
        window.location.href = url.toString();
      }, 5000);
      
      return; // 不继续执行后续逻辑
    }
  } else {
    // 如果没有URL参数，使用默认值并保持原始布局
    if (!projectIdInput.value) {
      projectIdInput.value = 1;
    }
    
    // 确保布局是原始的4列布局
    const startDateColumn = document.getElementById('org-start-date').closest('.col-md-4');
    const endDateColumn = document.getElementById('org-end-date').closest('.col-md-4');
    const buttonColumn = document.getElementById('generate-organization-btn').closest('.col-md-4');
    
    if (startDateColumn) startDateColumn.className = startDateColumn.className.replace('col-md-4', 'col-md-3');
    if (endDateColumn) endDateColumn.className = endDateColumn.className.replace('col-md-4', 'col-md-3');
    if (buttonColumn) buttonColumn.className = buttonColumn.className.replace('col-md-4', 'col-md-3');
    
    // 更新项目信息显示
    await updateProjectInfo(parseInt(projectIdInput.value, 10));
  }

  // 设置默认日期为今天
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('org-start-date').value = today;
  document.getElementById('org-end-date').value = today;

  // 绑定日期范围快捷按钮事件
  document.querySelectorAll('[data-range]').forEach(btn => {
    btn.addEventListener('click', () => {
      const range = btn.dataset.range;
      const today = new Date();
      let startDate = new Date(today);
      let endDate = new Date(today);

      switch (range) {
        case 'today':
          // 今天：开始和结束都是今天
          break;
        case 'yesterday':
          // 昨天：开始和结束都是昨天
          startDate.setDate(today.getDate() - 1);
          endDate.setDate(today.getDate() - 1);
          break;
        case 'week':
          // 最近7天：从7天前到今天
          startDate.setDate(today.getDate() - 6);
          break;
        case 'month':
          // 最近30天：从30天前到今天
          startDate.setDate(today.getDate() - 29);
          break;
      }

      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      document.getElementById('org-start-date').value = startDateStr;
      document.getElementById('org-end-date').value = endDateStr;

      // 添加视觉反馈
      btn.classList.add('active');
      setTimeout(() => {
        btn.classList.remove('active');
      }, 200);
    });
  });
}

// 检查项目是否需要密码认证
async function checkProjectAuthentication(projectId) {
  try {
    // 尝试获取项目信息（这个接口需要管理员权限，但我们可以通过认证接口来检查）
    const authResult = await authenticateProject(projectId, '');

    if (authResult.success) {
      // 项目不需要密码或密码为空
      state.currentProject = authResult.project;
      state.isAuthenticated = true;
      return true;
    } else if (authResult.message && authResult.message.includes('需要密码')) {
      // 项目需要密码
      return false;
    } else {
      // 项目不存在或其他错误
      throw new Error(authResult.message || '项目验证失败');
    }
  } catch (error) {
    throw error;
  }
}

// 显示密码认证模态框
function showPasswordModal(projectId) {
  const modal = new bootstrap.Modal(document.getElementById('projectPasswordModal'));
  const passwordInput = document.getElementById('project-password');
  const errorDiv = document.getElementById('password-error');
  const authenticateBtn = document.getElementById('authenticate-btn');

  // 重置状态
  passwordInput.value = '';
  passwordInput.classList.remove('is-invalid');
  errorDiv.style.display = 'none';

  // 设置项目ID到模态框
  modal._element.dataset.projectId = projectId;

  // 显示模态框
  modal.show();

  // 聚焦到密码输入框
  modal._element.addEventListener('shown.bs.modal', () => {
    passwordInput.focus();
  });

  // 处理认证按钮点击
  authenticateBtn.onclick = async () => {
    const password = passwordInput.value.trim();
    if (!password) {
      passwordInput.classList.add('is-invalid');
      errorDiv.textContent = '请输入密码';
      errorDiv.style.display = 'block';
      return;
    }

    try {
      authenticateBtn.disabled = true;
      authenticateBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>验证中...';

      const authResult = await authenticateProject(projectId, password);

      if (authResult.success) {
        state.currentProject = authResult.project;
        state.isAuthenticated = true;
        modal.hide();

        // 认证成功后，可以继续生成报表
        const startDate = document.getElementById('org-start-date').value;
        const endDate = document.getElementById('org-end-date').value;
        if (startDate && endDate) {
          generateOrganizationReport();
        }
      } else {
        passwordInput.classList.add('is-invalid');
        errorDiv.textContent = authResult.message || '密码错误';
        errorDiv.style.display = 'block';
      }
    } catch (error) {
      passwordInput.classList.add('is-invalid');
      errorDiv.textContent = error.message || '认证失败';
      errorDiv.style.display = 'block';
    } finally {
      authenticateBtn.disabled = false;
      authenticateBtn.innerHTML = '<i class="bi bi-unlock-fill me-2"></i>验证';
    }
  };

  // 处理回车键
  passwordInput.onkeypress = (e) => {
    if (e.key === 'Enter') {
      authenticateBtn.click();
    }
  };
}

// 显示错误信息
let errorTimeout = null;
function showError(message, title = '错误：', duration = 5000) {
  const container = document.getElementById('error-message-container');
  const titleEl = document.getElementById('error-message-title');
  const textEl = document.getElementById('error-message-text');

  if (container && textEl) {
    // 清除之前的定时器
    if (errorTimeout) {
      clearTimeout(errorTimeout);
    }

    titleEl.textContent = title;
    textEl.textContent = message;
    container.classList.remove('d-none');
    container.classList.add('d-flex');

    // 自动滚动到错误区域
    container.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // 自动隐藏
    errorTimeout = setTimeout(() => {
      hideError();
    }, duration);
  } else {
    // 后备方案
    alert(`${title}${message}`);
  }
}

// 隐藏错误信息
function hideError() {
  const container = document.getElementById('error-message-container');
  if (container) {
    container.classList.remove('d-flex');
    container.classList.add('d-none');
  }
}
async function generateOrganizationReport() {
  // 优先从URL参数获取projectId，如果没有则从输入框获取
  const urlProjectId = getUrlParameter('projectId');
  let projectId;

  if (urlProjectId && !isNaN(parseInt(urlProjectId, 10))) {
    projectId = parseInt(urlProjectId, 10);
  } else {
    const projectIdInput = document.getElementById('org-project-id');
    if (projectIdInput && projectIdInput.value) {
      projectId = parseInt(projectIdInput.value, 10);
    }
  }

  const startDate = document.getElementById('org-start-date').value;
  const endDate = document.getElementById('org-end-date').value;

  // 验证输入
  if (!projectId || projectId < 1) {
    showError('请输入有效的项目ID', '验证失败：');
    return;
  }

  if (!startDate || !endDate) {
    showError('请选择日期范围', '验证失败：');
    return;
  }

  // 验证日期范围
  if (new Date(startDate) > new Date(endDate)) {
    showError('开始日期不能晚于结束日期', '验证失败：');
    return;
  }

  // 检查项目认证状态
  if (!state.isAuthenticated || !state.currentProject || state.currentProject.id !== projectId) {
    try {
      const needsAuth = !(await checkProjectAuthentication(projectId));
      if (needsAuth) {
        showPasswordModal(projectId);
        return;
      }
    } catch (error) {
      showError(error.message || '无法验证项目权限', '项目验证失败：');
      return;
    }
  }

  const loadingEl = document.getElementById('organization-loading');
  const resultEl = document.getElementById('organization-result');
  const emptyEl = document.getElementById('organization-empty');

  try {
    loadingEl.style.display = 'block';
    resultEl.style.display = 'none';
    emptyEl.style.display = 'none';

    // 统一使用按天分组的报表API（单天也是多天的特例）
    const result = await getProjectOrganizationReportByDays(projectId, startDate, endDate);
    state.dailyReports = result.dailyReports;
    state.combinedReport = result.combinedReport;
    state.organizationReport = result.combinedReport; // 保持兼容性

    loadingEl.style.display = 'none';

    // 如果没有数据，显示空消息
    if (result.dailyReports.length === 0) {
      emptyEl.style.display = 'block';
      return;
    }

    // 显示报表结果（统一使用多天报表渲染）
    renderMultipleDaysReport(result);
    resultEl.style.display = 'block';

  } catch (error) {
    loadingEl.style.display = 'none';
    showError(error.message || '生成报表时发生未知错误');
    console.error(error);
  }
}

// 渲染项目整理报表
function renderOrganizationReport(report) {
  const { devices: sessions, keys, matrix, sessionInfo, totalDevices: totalSessions, totalKeys, totalEntries } = report;

  // 更新汇总信息
  document.getElementById('org-total-devices').textContent = totalSessions;
  document.getElementById('org-total-keys').textContent = totalKeys;
  document.getElementById('org-total-entries').textContent = totalEntries;

  // 构建表头
  const tableHeader = document.getElementById('org-table-header');
  tableHeader.innerHTML = '<th class="session-info-header">会话索引</th><th class="session-info-header">启动时间</th><th class="session-info-header">会话UUID</th>';
  keys.forEach(key => {
    const th = document.createElement('th');
    th.textContent = key;
    tableHeader.appendChild(th);
  });

  // 构建表格内容
  const tableBody = document.getElementById('org-table-body');
  tableBody.innerHTML = '';

  sessions.forEach(session => {
    const row = document.createElement('tr');

    // 会话索引列（只显示数字）
    const sessionIndexCell = document.createElement('td');
    const sessionData = sessionInfo[session];
    sessionIndexCell.textContent = sessionData.index;
    sessionIndexCell.className = 'session-info-cell';
    row.appendChild(sessionIndexCell);

    // 启动时间列
    const startTimeCell = document.createElement('td');
    const startTime = new Date(sessionData.startTime).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    startTimeCell.textContent = startTime;
    startTimeCell.className = 'session-info-cell';
    row.appendChild(startTimeCell);

    // 会话UUID列
    const sessionUuidCell = document.createElement('td');
    sessionUuidCell.textContent = truncateText(sessionData.uuid, 20);
    sessionUuidCell.title = sessionData.uuid; // 完整UUID作为tooltip
    sessionUuidCell.className = 'session-info-cell';
    row.appendChild(sessionUuidCell);

    // 数据列
    keys.forEach(key => {
      const cell = document.createElement('td');
      const value = matrix[session][key];

      if (value !== null && value !== undefined) {
        cell.textContent = truncateText(value, 15);
        cell.className = 'has-value';
        cell.title = `${key}: ${value}`;
      } else {
        cell.textContent = '-';
        cell.className = 'no-value';
        cell.title = `${key}: 无数据`;
      }

      row.appendChild(cell);
    });


    tableBody.appendChild(row);
  });
}

// 导出Excel（兼容原有的单报表导出）
function exportToExcel() {
  if (!state.organizationReport) {
    alert('没有可导出的数据');
    return;
  }

  const report = state.organizationReport;
  const { projectId, startDate, endDate } = report;

  // 如果没有数据，提示用户
  if (report.devices.length === 0 || report.keys.length === 0) {
    alert('没有可导出的矩阵数据');
    return;
  }

  // 使用通用导出函数
  const dateRange = startDate === endDate ? startDate : `${startDate}_至_${endDate}`;
  exportReportToExcel(report, `项目整理报表_项目${projectId}_${dateRange}`);
}

// 渲染多天报表
function renderMultipleDaysReport(result) {
  const { dailyReports, combinedReport } = result;

  // 更新汇总信息（使用合并报表的数据）
  document.getElementById('org-total-devices').textContent = combinedReport.totalDevices;
  document.getElementById('org-total-keys').textContent = combinedReport.totalKeys;
  document.getElementById('org-total-entries').textContent = combinedReport.totalEntries;

  // 构建表头（使用合并报表的keys）
  const tableHeader = document.getElementById('org-table-header');
  tableHeader.innerHTML = '<th class="session-info-header">会话索引</th><th class="session-info-header">启动时间</th><th class="session-info-header">会话UUID</th>';
  combinedReport.keys.forEach(key => {
    const th = document.createElement('th');
    th.textContent = key;
    tableHeader.appendChild(th);
  });

  // 构建表格内容（显示合并报表）
  const tableBody = document.getElementById('org-table-body');
  tableBody.innerHTML = '';

  combinedReport.devices.forEach(session => {
    const row = document.createElement('tr');

    // 会话索引列（只显示数字）
    const sessionIndexCell = document.createElement('td');
    const sessionData = combinedReport.sessionInfo[session];
    sessionIndexCell.textContent = sessionData.index;
    sessionIndexCell.className = 'session-info-cell';
    row.appendChild(sessionIndexCell);

    // 启动时间列
    const startTimeCell = document.createElement('td');
    const startTime = new Date(sessionData.startTime).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    startTimeCell.textContent = startTime;
    startTimeCell.className = 'session-info-cell';
    row.appendChild(startTimeCell);

    // 会话UUID列
    const sessionUuidCell = document.createElement('td');
    sessionUuidCell.textContent = truncateText(sessionData.uuid, 20);
    sessionUuidCell.title = sessionData.uuid; // 完整UUID作为tooltip
    sessionUuidCell.className = 'session-info-cell';
    row.appendChild(sessionUuidCell);

    // 数据列
    combinedReport.keys.forEach(key => {
      const cell = document.createElement('td');
      const value = combinedReport.matrix[session][key];

      if (value !== null && value !== undefined) {
        cell.textContent = truncateText(value, 15);
        cell.className = 'has-value';
        cell.title = `${key}: ${value}`;
      } else {
        cell.textContent = '-';
        cell.className = 'no-value';
        cell.title = `${key}: 无数据`;
      }

      row.appendChild(cell);
    });

    tableBody.appendChild(row);
  });

  // 显示多天报表的下载选项
  renderMultipleDaysDownloadOptions(dailyReports, combinedReport);
}

// 渲染多天报表的下载选项
function renderMultipleDaysDownloadOptions(dailyReports, combinedReport) {
  // 隐藏原有的单个导出按钮
  // 隐藏单天导出按钮 (已移至工具栏)

  // 创建或更新多天下载区域
  let downloadArea = document.getElementById('multiple-days-download-area');
  if (!downloadArea) {
    downloadArea = document.createElement('div');
    downloadArea.id = 'multiple-days-download-area';
    downloadArea.className = 'mb-4';

    // 插入到统计卡片后面（stats-row之后）
    const statsRow = document.querySelector('.stats-row');
    if (statsRow) {
      statsRow.parentNode.insertBefore(downloadArea, statsRow.nextSibling);
    } else {
      // 后备位置：矩阵表格区域之前
      const matrixCard = document.querySelector('.matrix-card');
      if (matrixCard) {
        matrixCard.parentNode.insertBefore(downloadArea, matrixCard);
      }
    }
  }

  downloadArea.innerHTML = `
    <div class="d-flex align-items-center justify-content-between flex-wrap gap-3 p-3 rounded-3" 
         style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%);">
      <div class="d-flex align-items-center gap-3 flex-wrap">
        <span class="text-white-50 small"><i class="bi bi-download me-1"></i>导出:</span>
        ${dailyReports.map(report => `
          <button class="btn btn-sm px-3 py-1" 
            style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #fff; border-radius: 6px; font-size: 0.85rem;"
            onmouseover="this.style.background='rgba(255,255,255,0.25)'"
            onmouseout="this.style.background='rgba(255,255,255,0.1)'"
            onclick="exportDailyReport('${report.date}')">
            ${report.date}
          </button>
        `).join('')}
      </div>
      <div class="d-flex align-items-center gap-2">
        <button class="btn btn-sm px-3 py-1" 
          style="background: #28a745; border: none; color: #fff; border-radius: 6px; font-weight: 500;"
          onclick="exportCombinedReport()">
          <i class="bi bi-file-earmark-spreadsheet me-1"></i>合并
        </button>
        <button class="btn btn-sm px-3 py-1" 
          style="background: #6f42c1; border: none; color: #fff; border-radius: 6px; font-weight: 500;"
          onclick="exportAllReports()">
          <i class="bi bi-file-zip me-1"></i>ZIP
        </button>
      </div>
    </div>
  `;
}

// 导出单日报表
function exportDailyReport(date) {
  if (!state.dailyReports) {
    alert('没有可导出的数据');
    return;
  }

  const dailyReport = state.dailyReports.find(report => report.date === date);
  if (!dailyReport) {
    alert('找不到指定日期的报表');
    return;
  }

  exportReportToExcel(dailyReport, `项目整理报表_项目${dailyReport.projectId}_${date}`);
}

// 导出合并报表
function exportCombinedReport() {
  if (!state.combinedReport) {
    alert('没有可导出的数据');
    return;
  }

  const { projectId, startDate, endDate } = state.combinedReport;
  const dateRange = startDate === endDate ? startDate : `${startDate}_至_${endDate}`;
  exportReportToExcel(state.combinedReport, `项目整理报表_项目${projectId}_${dateRange}_合并`);
}

// 导出所有报表（ZIP格式）
async function exportAllReports() {
  if (!state.dailyReports || !state.combinedReport) {
    alert('没有可导出的数据');
    return;
  }

  try {
    // 动态加载JSZip库
    if (typeof JSZip === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
      document.head.appendChild(script);

      await new Promise((resolve, reject) => {
        script.onload = resolve;
        script.onerror = reject;
      });
    }

    const zip = new JSZip();

    // 添加每日报表
    for (const dailyReport of state.dailyReports) {
      const wb = createWorkbookFromReport(dailyReport);
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      zip.file(`${dailyReport.date}.xlsx`, excelBuffer);
    }

    // 添加合并报表
    const combinedWb = createWorkbookFromReport(state.combinedReport);
    const combinedBuffer = XLSX.write(combinedWb, { bookType: 'xlsx', type: 'array' });
    const { projectId, startDate, endDate } = state.combinedReport;
    const dateRange = startDate === endDate ? startDate : `${startDate}_至_${endDate}`;
    zip.file(`合并报表_${dateRange}.xlsx`, combinedBuffer);

    // 生成ZIP文件
    const zipBlob = await zip.generateAsync({ type: 'blob' });

    // 下载ZIP文件
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `项目整理报表_项目${projectId}_${dateRange}_全部_${timestamp}.zip`;

    const link = document.createElement('a');
    link.href = URL.createObjectURL(zipBlob);
    link.download = filename;
    link.click();

    console.log('ZIP文件已导出:', filename);
  } catch (error) {
    console.error('导出ZIP文件失败:', error);
    alert('导出ZIP文件失败: ' + error.message);
  }
}

// 通用的报表导出函数
function exportReportToExcel(report, baseFilename) {
  const wb = createWorkbookFromReport(report);

  // 生成文件名
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const filename = `${baseFilename}_${timestamp}.xlsx`;

  // 导出文件
  XLSX.writeFile(wb, filename);
  console.log('Excel文件已导出:', filename);
}

// 从报表数据创建工作簿
function createWorkbookFromReport(report) {
  const { devices: sessions, keys, matrix, sessionInfo } = report;

  // 创建工作簿
  const wb = XLSX.utils.book_new();

  // 创建矩阵数据
  const matrixData = [
    ['会话索引', '启动时间', '会话UUID', ...keys] // 表头
  ];

  // 添加数据行
  sessions.forEach(session => {
    const sessionData = sessionInfo[session];
    const startTime = new Date(sessionData.startTime).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    const row = [
      sessionData.index, // 会话索引（数字）
      startTime, // 启动时间
      sessionData.uuid // 会话UUID
    ];

    keys.forEach(key => {
      const value = matrix[session][key];
      row.push(value || ''); // 如果没有值就用空字符串
    });
    matrixData.push(row);
  });

  const wsMatrix = XLSX.utils.aoa_to_sheet(matrixData);

  // 设置列宽
  const cols = [
    { wch: 10 }, // 会话索引列
    { wch: 20 }, // 启动时间列
    { wch: 40 }, // 会话UUID列
  ];
  keys.forEach(() => cols.push({ wch: 20 })); // 数据列
  wsMatrix['!cols'] = cols;

  // 设置表头样式（第一行）
  const headerRange = XLSX.utils.decode_range(wsMatrix['!ref']);
  for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
    if (!wsMatrix[cellAddress]) continue;
    wsMatrix[cellAddress].s = {
      font: { bold: true },
      fill: { fgColor: { rgb: "F5F5F5" } },
      border: {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" }
      }
    };
  }

  XLSX.utils.book_append_sheet(wb, wsMatrix, '项目整理报表');
  return wb;
}

// 事件绑定
document.addEventListener('DOMContentLoaded', async () => {
  // 初始化
  await initOrganizationReport();

  // 生成报表按钮
  document.getElementById('generate-organization-btn').addEventListener('click', generateOrganizationReport);

  // 导出Excel按钮
  // export-excel-btn 已移除，导出功能集成到工具栏

  // 项目ID和日期输入框回车键
  document.getElementById('org-project-id').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      generateOrganizationReport();
    }
  });

  document.getElementById('org-start-date').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      generateOrganizationReport();
    }
  });

  document.getElementById('org-end-date').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      generateOrganizationReport();
    }
  });
});
