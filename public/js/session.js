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
  const res = await fetch(`${API_BASE}/projects/${projectId}`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error?.message || '获取项目信息失败');
  }
  return res.json();
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

// 状态管理
const state = {
  organizationReport: null,
  dailyReports: null,
  combinedReport: null,
  currentProject: null,
  isAuthenticated: false
};

// 初始化项目整理报表
function initOrganizationReport() {
  // 检查URL参数中是否有projectId
  const urlProjectId = getUrlParameter('projectId');
  const projectIdInput = document.getElementById('org-project-id');
  const projectIdContainer = projectIdInput.closest('.col-md-4');
  
  if (urlProjectId && !isNaN(parseInt(urlProjectId, 10))) {
    // 如果URL中有有效的projectId参数，隐藏项目ID字段
    const projectId = parseInt(urlProjectId, 10);
    projectIdInput.value = projectId;
    
    // 隐藏整个项目ID容器
    projectIdContainer.style.display = 'none';
    
    // 调整布局：将日期范围和按钮容器改为合适的宽度
    const startDateContainer = document.querySelector('#org-start-date').closest('.col-md-6');
    const endDateContainer = document.querySelector('#org-end-date').closest('.col-md-6');
    const buttonContainer = document.querySelector('#generate-organization-btn').closest('.col-md-3');
    
    if (startDateContainer && endDateContainer) {
      startDateContainer.className = 'col-md-4';
      endDateContainer.className = 'col-md-4';
    }
    if (buttonContainer) {
      buttonContainer.className = 'col-md-4 d-flex flex-column justify-content-end';
    }
    
    // 更新页面标题显示当前项目
    const headerTitle = document.querySelector('.header-section h1');
    const headerDesc = document.querySelector('.header-section p');
    headerTitle.innerHTML = `<i class="bi bi-graph-up-arrow me-3"></i>项目整理报表 - 项目 ${projectId}`;
    headerDesc.textContent = `查看项目 ${projectId} 中会话和数据的矩阵报表，支持Excel导出`;
  } else {
    // 如果没有URL参数，使用默认值和原始布局
    if (!projectIdInput.value) {
      projectIdInput.value = 1;
    }
    
    // 确保使用原始布局（三列各占1/3）
    const containers = document.querySelectorAll('.row.g-3 > div');
    containers.forEach(container => {
      if (container.classList.contains('col-md-6')) {
        container.className = 'col-md-4';
      }
    });
    
    // 重置按钮容器的特殊样式
    const buttonContainer = document.querySelector('#generate-organization-btn').closest('div');
    if (buttonContainer.classList.contains('d-flex')) {
      buttonContainer.className = 'col-md-4 d-flex flex-column justify-content-end';
    }
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
async function generateOrganizationReport() {
  const projectId = parseInt(document.getElementById('org-project-id').value, 10);
  const startDate = document.getElementById('org-start-date').value;
  const endDate = document.getElementById('org-end-date').value;

  // 验证输入
  if (!projectId || projectId < 1) {
    alert('请输入有效的项目ID');
    return;
  }

  if (!startDate || !endDate) {
    alert('请选择日期范围');
    return;
  }

  // 验证日期范围
  if (new Date(startDate) > new Date(endDate)) {
    alert('开始日期不能晚于结束日期');
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
      alert('项目验证失败: ' + error.message);
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

    // 检查是否是多天范围
    const isMultipleDays = startDate !== endDate;
    
    if (isMultipleDays) {
      // 获取按天分组的报表
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

      // 显示多天报表结果
      renderMultipleDaysReport(result);
      resultEl.style.display = 'block';
    } else {
      // 单天报表，使用原有逻辑
      const report = await getProjectOrganizationReport(projectId, startDate, endDate);
      state.organizationReport = report;
      state.dailyReports = null;
      state.combinedReport = null;

      loadingEl.style.display = 'none';

      // 如果没有数据，显示空消息
      if (report.totalDevices === 0 || report.totalKeys === 0) {
        emptyEl.style.display = 'block';
        return;
      }

      // 显示单天报表结果
      renderOrganizationReport(report);
      resultEl.style.display = 'block';
    }

  } catch (error) {
    loadingEl.style.display = 'none';
    alert('生成报表失败: ' + error.message);
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

  // 显示导出按钮
  document.getElementById('export-excel-btn').style.display = 'inline-block';
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
  document.getElementById('export-excel-btn').style.display = 'none';
  
  // 创建或更新多天下载区域
  let downloadArea = document.getElementById('multiple-days-download-area');
  if (!downloadArea) {
    downloadArea = document.createElement('div');
    downloadArea.id = 'multiple-days-download-area';
    downloadArea.className = 'mt-3';
    
    // 插入到导出按钮的位置
    const exportBtn = document.getElementById('export-excel-btn');
    exportBtn.parentNode.insertBefore(downloadArea, exportBtn);
  }
  
  downloadArea.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h6 class="mb-0"><i class="bi bi-download me-2"></i>报表下载选项</h6>
      </div>
      <div class="card-body">
        <div class="row">
          <div class="col-md-6">
            <h6>按日期分别下载</h6>
            <div id="daily-download-buttons" class="d-flex flex-wrap gap-2">
              ${dailyReports.map(report => `
                <button class="btn btn-outline-primary btn-sm" onclick="exportDailyReport('${report.date}')">
                  <i class="bi bi-file-earmark-excel me-1"></i>${report.date}
                </button>
              `).join('')}
            </div>
          </div>
          <div class="col-md-6">
            <h6>统一下载</h6>
            <div class="d-flex flex-wrap gap-2">
              <button class="btn btn-success" onclick="exportCombinedReport()">
                <i class="bi bi-file-earmark-excel me-2"></i>合并报表
              </button>
              <button class="btn btn-info" onclick="exportAllReports()">
                <i class="bi bi-archive me-2"></i>全部报表 (ZIP)
              </button>
            </div>
          </div>
        </div>
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
document.addEventListener('DOMContentLoaded', () => {
  // 初始化
  initOrganizationReport();

  // 生成报表按钮
  document.getElementById('generate-organization-btn').addEventListener('click', generateOrganizationReport);

  // 导出Excel按钮
  document.getElementById('export-excel-btn').addEventListener('click', exportToExcel);

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
