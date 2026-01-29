/**
 * Jest 测试设置文件
 */

const puppeteer = require('puppeteer');

// 全局变量
global.browser = null;

// 测试套件开始前的设置
beforeAll(async () => {
  // 启动浏览器（用于E2E测试）
  global.browser = await puppeteer.launch({
    headless: true, // 在CI环境中使用无头模式
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ]
  });
});

// 测试套件结束后的清理
afterAll(async () => {
  if (global.browser) {
    await global.browser.close();
  }
});

// 全局错误处理
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// 测试超时警告
const originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
jasmine.DEFAULT_TIMEOUT_INTERVAL = 30000;

// 自定义匹配器
expect.extend({
  toBeValidDate(received) {
    const pass = received instanceof Date && !isNaN(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid date`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid date`,
        pass: false,
      };
    }
  },
  
  toBeValidDateString(received) {
    const pass = typeof received === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid date string (YYYY-MM-DD)`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid date string (YYYY-MM-DD)`,
        pass: false,
      };
    }
  }
});

// 测试数据清理助手
global.testHelpers = {
  // 等待元素出现
  waitForElement: async (page, selector, timeout = 5000) => {
    try {
      await page.waitForSelector(selector, { timeout });
      return true;
    } catch (error) {
      return false;
    }
  },
  
  // 等待元素消失
  waitForElementToDisappear: async (page, selector, timeout = 5000) => {
    try {
      await page.waitForFunction(
        (sel) => !document.querySelector(sel),
        { timeout },
        selector
      );
      return true;
    } catch (error) {
      return false;
    }
  },
  
  // 获取今天的日期字符串
  getTodayString: () => {
    return new Date().toISOString().split('T')[0];
  },
  
  // 获取指定天数前的日期字符串
  getDateString: (daysAgo = 0) => {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString().split('T')[0];
  },
  
  // 清理测试数据
  cleanupTestData: async () => {
    // 这里可以添加清理测试数据的逻辑
    console.log('Cleaning up test data...');
  }
};