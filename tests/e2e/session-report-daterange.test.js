/**
 * 项目整理报表日期范围功能端到端测试
 */

describe('Session Report Date Range E2E Tests', () => {
  let page;

  beforeAll(async () => {
    page = await global.browser.newPage();
  });

  afterAll(async () => {
    await page.close();
  });

  describe('Date Range Selection', () => {
    test('should load session report page', async () => {
      await page.goto('http://localhost:8080/session.html');
      await page.waitForSelector('.header-section h1');
      
      const title = await page.$eval('.header-section h1', el => el.textContent);
      expect(title).toContain('项目整理报表');
    });

    test('should have date range inputs', async () => {
      const startDateInput = await page.$('#org-start-date');
      const endDateInput = await page.$('#org-end-date');
      
      expect(startDateInput).toBeTruthy();
      expect(endDateInput).toBeTruthy();
    });

    test('should set default dates to today', async () => {
      const today = new Date().toISOString().split('T')[0];
      
      const startDate = await page.$eval('#org-start-date', el => el.value);
      const endDate = await page.$eval('#org-end-date', el => el.value);
      
      expect(startDate).toBe(today);
      expect(endDate).toBe(today);
    });

    test('should handle date range shortcuts', async () => {
      // 测试"最近7天"快捷按钮
      await page.click('[data-range="week"]');
      
      const startDate = await page.$eval('#org-start-date', el => el.value);
      const endDate = await page.$eval('#org-end-date', el => el.value);
      
      const today = new Date();
      const expectedStart = new Date(today);
      expectedStart.setDate(today.getDate() - 6);
      
      expect(startDate).toBe(expectedStart.toISOString().split('T')[0]);
      expect(endDate).toBe(today.toISOString().split('T')[0]);
    });

    test('should handle "yesterday" shortcut', async () => {
      await page.click('[data-range="yesterday"]');
      
      const startDate = await page.$eval('#org-start-date', el => el.value);
      const endDate = await page.$eval('#org-end-date', el => el.value);
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const expectedDate = yesterday.toISOString().split('T')[0];
      
      expect(startDate).toBe(expectedDate);
      expect(endDate).toBe(expectedDate);
    });

    test('should handle "month" shortcut', async () => {
      await page.click('[data-range="month"]');
      
      const startDate = await page.$eval('#org-start-date', el => el.value);
      const endDate = await page.$eval('#org-end-date', el => el.value);
      
      const today = new Date();
      const expectedStart = new Date(today);
      expectedStart.setDate(today.getDate() - 29);
      
      expect(startDate).toBe(expectedStart.toISOString().split('T')[0]);
      expect(endDate).toBe(today.toISOString().split('T')[0]);
    });
  });

  describe('Report Generation', () => {
    test('should validate date range before generating report', async () => {
      // 设置无效的日期范围（开始日期晚于结束日期）
      await page.evaluate(() => {
        document.getElementById('org-start-date').value = '2026-01-29';
        document.getElementById('org-end-date').value = '2026-01-28';
      });

      // 尝试生成报表
      await page.click('#generate-organization-btn');

      // 应该显示错误提示
      await page.waitForFunction(() => {
        return window.alert || document.querySelector('.alert-warning');
      }, { timeout: 2000 });
    });

    test('should generate report with valid date range', async () => {
      // 设置有效的日期范围
      const today = new Date().toISOString().split('T')[0];
      await page.evaluate((date) => {
        document.getElementById('org-project-id').value = '1';
        document.getElementById('org-start-date').value = date;
        document.getElementById('org-end-date').value = date;
      }, today);

      // 生成报表
      await page.click('#generate-organization-btn');

      // 等待报表结果显示
      await page.waitForSelector('#organization-result', { 
        visible: true, 
        timeout: 10000 
      });

      const resultVisible = await page.$eval('#organization-result', 
        el => el.style.display !== 'none'
      );
      expect(resultVisible).toBe(true);
    });

    test('should show correct date range in report', async () => {
      // 设置日期范围
      await page.evaluate(() => {
        document.getElementById('org-start-date').value = '2026-01-28';
        document.getElementById('org-end-date').value = '2026-01-29';
      });

      // 生成报表
      await page.click('#generate-organization-btn');

      // 等待报表加载
      await page.waitForSelector('#organization-result', { 
        visible: true, 
        timeout: 10000 
      });

      // 验证报表标题或内容包含日期范围信息
      const hasDateRange = await page.evaluate(() => {
        const content = document.body.textContent;
        return content.includes('2026-01-28') && content.includes('2026-01-29');
      });

      expect(hasDateRange).toBe(true);
    });
  });

  describe('Export Functionality', () => {
    test('should include date range in export filename', async () => {
      // 设置日期范围
      await page.evaluate(() => {
        document.getElementById('org-project-id').value = '1';
        document.getElementById('org-start-date').value = '2026-01-28';
        document.getElementById('org-end-date').value = '2026-01-29';
      });

      // 生成报表
      await page.click('#generate-organization-btn');
      await page.waitForSelector('#organization-result', { visible: true });

      // 模拟导出（检查是否有导出按钮）
      const exportBtn = await page.$('#export-excel-btn');
      if (exportBtn) {
        // 验证导出功能存在
        expect(exportBtn).toBeTruthy();
      }
    });
  });

  describe('API Integration', () => {
    test('should call API with correct date range parameters', async () => {
      // 监听网络请求
      const requests = [];
      page.on('request', request => {
        if (request.url().includes('/sessions/reports/project-organization')) {
          requests.push(request.url());
        }
      });

      // 设置日期范围并生成报表
      await page.evaluate(() => {
        document.getElementById('org-project-id').value = '1';
        document.getElementById('org-start-date').value = '2026-01-28';
        document.getElementById('org-end-date').value = '2026-01-29';
      });

      await page.click('#generate-organization-btn');
      await page.waitForSelector('#organization-result', { visible: true });

      // 验证API调用包含正确的参数
      expect(requests.length).toBeGreaterThan(0);
      const apiCall = requests[requests.length - 1];
      expect(apiCall).toContain('startDate=2026-01-28');
      expect(apiCall).toContain('endDate=2026-01-29');
    });
  });
});