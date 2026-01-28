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
async function getProjectOrganizationReport(projectId, date) {
  const res = await fetch(`${API_BASE}/sessions/reports/project-organization?projectId=${projectId}&date=${date}`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error?.message || '获取项目整理报表失败');
  }
  return res.json();
}

// 状态管理
const state = {
  organizationReport: null
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
    
    // 调整布局：将日期和按钮容器改为各占一半宽度
    const dateContainer = document.querySelector('#org-date').closest('.col-md-4');
    const buttonContainer = document.querySelector('#generate-organization-btn').closest('.col-md-4');
    
    dateContainer.className = 'col-md-6';
    buttonContainer.className = 'col-md-6 d-flex flex-column justify-content-end';
    
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
  document.getElementById('org-date').value = today;
  
  // 绑定日期快捷按钮事件
  document.querySelectorAll('[data-days]').forEach(btn => {
    btn.addEventListener('click', () => {
      const days = parseInt(btn.dataset.days, 10);
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + days);
      const dateStr = targetDate.toISOString().split('T')[0];
      document.getElementById('org-date').value = dateStr;
      
      // 添加视觉反馈
      btn.classList.add('active');
      setTimeout(() => {
        btn.classList.remove('active');
      }, 200);
    });
  });
}

// 生成项目整理报表
async function generateOrganizationReport() {
  const projectId = parseInt(document.getElementById('org-project-id').value, 10);
  const date = document.getElementById('org-date').value;

  // 验证输入
  if (!projectId || projectId < 1) {
    alert('请输入有效的项目ID');
    return;
  }

  if (!date) {
    alert('请选择日期');
    return;
  }

  const loadingEl = document.getElementById('organization-loading');
  const resultEl = document.getElementById('organization-result');
  const emptyEl = document.getElementById('organization-empty');

  try {
    loadingEl.style.display = 'block';
    resultEl.style.display = 'none';
    emptyEl.style.display = 'none';

    const report = await getProjectOrganizationReport(projectId, date);
    state.organizationReport = report;

    loadingEl.style.display = 'none';

    // 如果没有数据，显示空消息
    if (report.totalDevices === 0 || report.totalKeys === 0) {
      emptyEl.style.display = 'block';
      return;
    }

    // 显示报表结果
    renderOrganizationReport(report);
    resultEl.style.display = 'block';

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

// 导出Excel
function exportToExcel() {
  if (!state.organizationReport) {
    alert('没有可导出的数据');
    return;
  }

  const report = state.organizationReport;
  const { projectId, date, devices: sessions, keys, matrix, sessionInfo } = report;
  
  // 如果没有数据，提示用户
  if (sessions.length === 0 || keys.length === 0) {
    alert('没有可导出的矩阵数据');
    return;
  }

  // 创建工作簿
  const wb = XLSX.utils.book_new();

  // 创建矩阵数据 - 这是主要的报表内容
  const matrixData = [
    ['会话索引', '启动时间', '会话UUID', ...keys] // 表头：会话索引、启动时间、会话UUID，然后是所有的数据Key
  ];
  
  // 添加数据行：每行包含会话索引、启动时间、UUID及其对应的所有Key的值
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

  // 生成文件名
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const filename = `项目整理报表_项目${projectId}_${date}_${timestamp}.xlsx`;

  // 导出文件
  XLSX.writeFile(wb, filename);
  
  console.log('Excel文件已导出:', filename);
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

  document.getElementById('org-date').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      generateOrganizationReport();
    }
  });
});
