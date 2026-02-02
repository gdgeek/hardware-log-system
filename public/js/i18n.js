/**
 * 国际化 (i18n) 支持
 * 支持简体中文 (zh-CN)、繁体中文 (zh-TW)、英文 (en)
 */

const translations = {
  'zh-CN': {
    // 页面标题
    pageTitle: '项目整理报表 - 硬件日志管理系统',
    mainTitle: '项目整理报表',
    
    // 项目信息
    project: '项目',
    projectId: '项目 ID',
    projectNotFound: '项目不存在',
    viewReportDesc: '查看项目中会话和数据的矩阵报表，支持Excel导出',
    
    // 表单标签
    reportSettings: '报表参数设置',
    startDate: '开始日期',
    endDate: '结束日期',
    generateReport: '生成报表',
    multiDayRange: '多天范围生成综合报表',
    
    // 日期快捷按钮
    today: '今天',
    yesterday: '昨天',
    last7Days: '7天',
    last30Days: '30天',
    
    // 统计信息
    sessionCount: '会话数量',
    dataTypes: '数据类型',
    totalRecords: '总记录数',
    
    // 表格
    sessionIndex: '会话索引',
    startTime: '启动时间',
    sessionUuid: '会话UUID',
    sessionDataMatrix: '会话-数据矩阵',
    matrixDesc: '行：会话信息，列：数据Key，值：数据Value',
    noData: '无数据',
    
    // 错误和提示
    error: '错误：',
    validationFailed: '验证失败：',
    projectValidationFailed: '项目验证失败：',
    enterValidProjectId: '请输入有效的项目ID',
    selectDateRange: '请选择日期范围',
    startDateAfterEndDate: '开始日期不能晚于结束日期',
    cannotVerifyProject: '无法验证项目权限',
    generating: '正在生成报表，请稍候...',
    noDataForDate: '该项目在指定日期没有数据记录',
    noDataTitle: '暂无数据',
    
    // 密码认证
    projectAuth: '项目访问认证',
    projectNeedsPassword: '该项目需要密码才能访问，请输入密码：',
    projectPassword: '项目密码',
    enterPassword: '请输入项目密码',
    passwordError: '密码错误，请重试',
    enterPasswordPrompt: '请输入密码',
    verifying: '验证中...',
    verify: '验证',
    cancel: '取消',
    
    // 导出
    export: '导出',
    combined: '合并',
    rawData: '原始数据',
    noExportData: '没有可导出的数据',
    noMatrixData: '没有可导出的矩阵数据',
    dateNotFound: '找不到指定日期的报表',
    exportFailed: '导出ZIP文件失败',
    excelExported: 'Excel文件已导出',
    zipExported: 'ZIP文件已导出',
    
    // 原始日志列名
    deviceUuid: '设备UUID',
    clientIp: '客户端IP',
    logKey: '日志键',
    logValue: '日志值',
    clientTimestamp: '客户端时间戳',
    
    // 其他
    close: '关闭'
  },
  
  'zh-TW': {
    // 頁面標題
    pageTitle: '項目整理報表 - 硬件日誌管理系統',
    mainTitle: '項目整理報表',
    
    // 項目信息
    project: '項目',
    projectId: '項目 ID',
    projectNotFound: '項目不存在',
    viewReportDesc: '查看項目中會話和數據的矩陣報表，支持Excel導出',
    
    // 表單標籤
    reportSettings: '報表參數設置',
    startDate: '開始日期',
    endDate: '結束日期',
    generateReport: '生成報表',
    multiDayRange: '多天範圍生成綜合報表',
    
    // 日期快捷按鈕
    today: '今天',
    yesterday: '昨天',
    last7Days: '7天',
    last30Days: '30天',
    
    // 統計信息
    sessionCount: '會話數量',
    dataTypes: '數據類型',
    totalRecords: '總記錄數',
    
    // 表格
    sessionIndex: '會話索引',
    startTime: '啟動時間',
    sessionUuid: '會話UUID',
    sessionDataMatrix: '會話-數據矩陣',
    matrixDesc: '行：會話信息，列：數據Key，值：數據Value',
    noData: '無數據',
    
    // 錯誤和提示
    error: '錯誤：',
    validationFailed: '驗證失敗：',
    projectValidationFailed: '項目驗證失敗：',
    enterValidProjectId: '請輸入有效的項目ID',
    selectDateRange: '請選擇日期範圍',
    startDateAfterEndDate: '開始日期不能晚於結束日期',
    cannotVerifyProject: '無法驗證項目權限',
    generating: '正在生成報表，請稍候...',
    noDataForDate: '該項目在指定日期沒有數據記錄',
    noDataTitle: '暫無數據',
    
    // 密碼認證
    projectAuth: '項目訪問認證',
    projectNeedsPassword: '該項目需要密碼才能訪問，請輸入密碼：',
    projectPassword: '項目密碼',
    enterPassword: '請輸入項目密碼',
    passwordError: '密碼錯誤，請重試',
    enterPasswordPrompt: '請輸入密碼',
    verifying: '驗證中...',
    verify: '驗證',
    cancel: '取消',
    
    // 導出
    export: '導出',
    combined: '合併',
    rawData: '原始數據',
    noExportData: '沒有可導出的數據',
    noMatrixData: '沒有可導出的矩陣數據',
    dateNotFound: '找不到指定日期的報表',
    exportFailed: '導出ZIP文件失敗',
    excelExported: 'Excel文件已導出',
    zipExported: 'ZIP文件已導出',
    
    // 原始日誌列名
    deviceUuid: '設備UUID',
    clientIp: '客戶端IP',
    logKey: '日誌鍵',
    logValue: '日誌值',
    clientTimestamp: '客戶端時間戳',
    
    // 其他
    close: '關閉'
  },
  
  'en': {
    // Page titles
    pageTitle: 'Project Organization Report - Hardware Log Management System',
    mainTitle: 'Project Organization Report',
    
    // Project info
    project: 'Project',
    projectId: 'Project ID',
    projectNotFound: 'Project not found',
    viewReportDesc: 'View session and data matrix reports for projects, with Excel export support',
    
    // Form labels
    reportSettings: 'Report Settings',
    startDate: 'Start Date',
    endDate: 'End Date',
    generateReport: 'Generate Report',
    multiDayRange: 'Multi-day range generates comprehensive report',
    
    // Date shortcuts
    today: 'Today',
    yesterday: 'Yesterday',
    last7Days: '7 Days',
    last30Days: '30 Days',
    
    // Statistics
    sessionCount: 'Sessions',
    dataTypes: 'Data Types',
    totalRecords: 'Total Records',
    
    // Table
    sessionIndex: 'Session Index',
    startTime: 'Start Time',
    sessionUuid: 'Session UUID',
    sessionDataMatrix: 'Session-Data Matrix',
    matrixDesc: 'Rows: Session info, Columns: Data keys, Values: Data values',
    noData: 'No data',
    
    // Errors and messages
    error: 'Error: ',
    validationFailed: 'Validation Failed: ',
    projectValidationFailed: 'Project Validation Failed: ',
    enterValidProjectId: 'Please enter a valid project ID',
    selectDateRange: 'Please select a date range',
    startDateAfterEndDate: 'Start date cannot be later than end date',
    cannotVerifyProject: 'Unable to verify project permissions',
    generating: 'Generating report, please wait...',
    noDataForDate: 'No data records for this project on the specified date',
    noDataTitle: 'No Data',
    
    // Password authentication
    projectAuth: 'Project Access Authentication',
    projectNeedsPassword: 'This project requires a password to access. Please enter the password:',
    projectPassword: 'Project Password',
    enterPassword: 'Please enter project password',
    passwordError: 'Incorrect password, please try again',
    enterPasswordPrompt: 'Please enter password',
    verifying: 'Verifying...',
    verify: 'Verify',
    cancel: 'Cancel',
    
    // Export
    export: 'Export',
    combined: 'Combined',
    rawData: 'Raw Data',
    noExportData: 'No data to export',
    noMatrixData: 'No matrix data to export',
    dateNotFound: 'Report not found for specified date',
    exportFailed: 'Failed to export ZIP file',
    excelExported: 'Excel file exported',
    zipExported: 'ZIP file exported',
    
    // Raw log column names
    deviceUuid: 'Device UUID',
    clientIp: 'Client IP',
    logKey: 'Log Key',
    logValue: 'Log Value',
    clientTimestamp: 'Client Timestamp',
    
    // Other
    close: 'Close'
  }
};

// 当前语言
let currentLang = 'zh-CN';

/**
 * 初始化语言设置
 * 从 URL 参数读取语言设置，如果没有则使用默认语言
 */
function initLanguage() {
  const urlParams = new URLSearchParams(window.location.search);
  const lang = urlParams.get('lang');
  
  // 验证语言参数
  if (lang && translations[lang]) {
    currentLang = lang;
  } else {
    // 默认使用简体中文
    currentLang = 'zh-CN';
  }
  
  // 设置 HTML lang 属性
  document.documentElement.lang = currentLang;
  
  return currentLang;
}

/**
 * 获取翻译文本
 * @param {string} key - 翻译键
 * @param {string} lang - 语言代码（可选，默认使用当前语言）
 * @returns {string} 翻译后的文本
 */
function t(key, lang = null) {
  const targetLang = lang || currentLang;
  
  if (translations[targetLang] && translations[targetLang][key]) {
    return translations[targetLang][key];
  }
  
  // 如果找不到翻译，返回键名
  console.warn(`Translation not found for key: ${key} in language: ${targetLang}`);
  return key;
}

/**
 * 更新页面上所有带有 data-i18n 属性的元素
 */
function updatePageTranslations() {
  // 更新页面标题
  document.title = t('pageTitle');
  
  // 更新所有带有 data-i18n 属性的元素
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    const translation = t(key);
    
    // 根据元素类型更新内容
    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
      if (element.hasAttribute('placeholder')) {
        element.placeholder = translation;
      }
    } else {
      element.textContent = translation;
    }
  });
  
  // 更新带有 data-i18n-html 属性的元素（支持 HTML 内容）
  document.querySelectorAll('[data-i18n-html]').forEach(element => {
    const key = element.getAttribute('data-i18n-html');
    element.innerHTML = t(key);
  });
  
  // 更新带有 data-i18n-placeholder 属性的元素
  document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
    const key = element.getAttribute('data-i18n-placeholder');
    element.placeholder = t(key);
  });
  
  // 更新语言选择器按钮的激活状态
  updateLanguageSelectorButtons();
}

/**
 * 更新语言选择器按钮的激活状态
 */
function updateLanguageSelectorButtons() {
  document.querySelectorAll('.language-selector .btn').forEach(btn => {
    const btnLang = btn.getAttribute('onclick').match(/'([^']+)'/)[1];
    if (btnLang === currentLang) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

/**
 * 切换语言
 * @param {string} lang - 目标语言代码
 */
function switchLanguage(lang) {
  if (!translations[lang]) {
    console.error(`Language not supported: ${lang}`);
    return;
  }
  
  currentLang = lang;
  document.documentElement.lang = lang;
  
  // 更新 URL 参数
  const url = new URL(window.location.href);
  url.searchParams.set('lang', lang);
  window.history.replaceState({}, '', url);
  
  // 更新页面翻译
  updatePageTranslations();
}

/**
 * 获取当前语言
 * @returns {string} 当前语言代码
 */
function getCurrentLanguage() {
  return currentLang;
}

/**
 * 获取所有支持的语言
 * @returns {Array} 语言代码数组
 */
function getSupportedLanguages() {
  return Object.keys(translations);
}
