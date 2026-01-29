/**
 * 前端导航功能测试
 * 防止导航、模态框、hash路由等问题
 */

describe('Frontend Navigation Tests', () => {
  let page;

  beforeAll(async () => {
    // 启动浏览器和页面
    page = await global.browser.newPage();
    await page.goto('http://localhost:8080');
    
    // 登录
    await page.waitForSelector('#login-password');
    await page.type('#login-password', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForSelector('.app-container');
  });

  afterAll(async () => {
    await page.close();
  });

  describe('Hash Navigation', () => {
    test('should navigate to dashboard via hash', async () => {
      await page.goto('http://localhost:8080/#dashboard');
      await page.waitForSelector('#page-dashboard.active');
      
      const activePage = await page.$('#page-dashboard.active');
      expect(activePage).toBeTruthy();
      
      const url = page.url();
      expect(url).toContain('#dashboard');
    });

    test('should navigate to logs via hash', async () => {
      await page.goto('http://localhost:8080/#logs');
      await page.waitForSelector('#page-logs.active');
      
      const activePage = await page.$('#page-logs.active');
      expect(activePage).toBeTruthy();
      
      const url = page.url();
      expect(url).toContain('#logs');
    });

    test('should navigate to projects via hash', async () => {
      await page.goto('http://localhost:8080/#projects');
      await page.waitForSelector('#page-projects.active');
      
      const activePage = await page.$('#page-projects.active');
      expect(activePage).toBeTruthy();
      
      const url = page.url();
      expect(url).toContain('#projects');
    });

    test('should navigate to reports via hash', async () => {
      await page.goto('http://localhost:8080/#reports');
      await page.waitForSelector('#page-reports.active');
      
      const activePage = await page.$('#page-reports.active');
      expect(activePage).toBeTruthy();
      
      const url = page.url();
      expect(url).toContain('#reports');
    });

    test('should maintain hash on page refresh', async () => {
      await page.goto('http://localhost:8080/#projects');
      await page.waitForSelector('#page-projects.active');
      
      await page.reload();
      await page.waitForSelector('#page-projects.active');
      
      const activePage = await page.$('#page-projects.active');
      expect(activePage).toBeTruthy();
      
      const url = page.url();
      expect(url).toContain('#projects');
    });
  });

  describe('Sidebar Navigation', () => {
    test('should update hash when clicking sidebar navigation', async () => {
      // 点击日志管理
      await page.click('a[data-page="logs"]');
      await page.waitForSelector('#page-logs.active');
      
      const url = page.url();
      expect(url).toContain('#logs');
      
      // 点击项目管理
      await page.click('a[data-page="projects"]');
      await page.waitForSelector('#page-projects.active');
      
      const url2 = page.url();
      expect(url2).toContain('#projects');
    });

    test('should highlight active navigation item', async () => {
      await page.click('a[data-page="logs"]');
      await page.waitForSelector('#page-logs.active');
      
      const activeNavItem = await page.$('a[data-page="logs"].active');
      expect(activeNavItem).toBeTruthy();
    });
  });

  describe('Modal Functionality', () => {
    test('should open and close add log modal', async () => {
      // 导航到日志页面
      await page.click('a[data-page="logs"]');
      await page.waitForSelector('#page-logs.active');
      
      // 点击添加日志按钮
      await page.click('#btn-add-log');
      await page.waitForSelector('#add-log-modal.active');
      
      const modal = await page.$('#add-log-modal.active');
      expect(modal).toBeTruthy();
      
      // 点击关闭按钮
      await page.click('#add-log-modal .modal-close');
      await page.waitForFunction(() => {
        const modal = document.querySelector('#add-log-modal.active');
        return !modal;
      });
      
      const closedModal = await page.$('#add-log-modal.active');
      expect(closedModal).toBeFalsy();
    });

    test('should open and close project modal', async () => {
      // 导航到项目页面
      await page.click('a[data-page="projects"]');
      await page.waitForSelector('#page-projects.active');
      
      // 点击新建项目按钮
      await page.click('#btn-add-project');
      await page.waitForSelector('#project-modal.active');
      
      const modal = await page.$('#project-modal.active');
      expect(modal).toBeTruthy();
      
      // 点击关闭按钮
      await page.click('#project-modal .modal-close');
      await page.waitForFunction(() => {
        const modal = document.querySelector('#project-modal.active');
        return !modal;
      });
      
      const closedModal = await page.$('#project-modal.active');
      expect(closedModal).toBeFalsy();
    });

    test('should close modal when clicking backdrop', async () => {
      // 导航到项目页面
      await page.click('a[data-page="projects"]');
      await page.waitForSelector('#page-projects.active');
      
      // 点击新建项目按钮
      await page.click('#btn-add-project');
      await page.waitForSelector('#project-modal.active');
      
      // 点击模态框外部关闭
      await page.click('#project-modal');
      await page.waitForFunction(() => {
        const modal = document.querySelector('#project-modal.active');
        return !modal;
      });
      
      const closedModal = await page.$('#project-modal.active');
      expect(closedModal).toBeFalsy();
    });
  });

  describe('Project Management', () => {
    test('should load projects list', async () => {
      await page.click('a[data-page="projects"]');
      await page.waitForSelector('#page-projects.active');
      
      // 等待项目列表加载
      await page.waitForFunction(() => {
        const tbody = document.querySelector('#projects-tbody');
        return tbody && tbody.children.length > 0;
      }, { timeout: 5000 });
      
      const projectRows = await page.$$('#projects-tbody tr');
      expect(projectRows.length).toBeGreaterThan(0);
    });

    test('should show project statistics', async () => {
      await page.click('a[data-page="projects"]');
      await page.waitForSelector('#page-projects.active');
      
      await page.waitForSelector('#total-projects');
      const totalProjects = await page.$eval('#total-projects', el => el.textContent);
      expect(parseInt(totalProjects)).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Session Report Integration', () => {
    test('should open session report in new window', async () => {
      const newPagePromise = new Promise(resolve => {
        page.browser().once('targetcreated', target => {
          resolve(target.page());
        });
      });
      
      await page.click('#btn-open-reports');
      
      const newPage = await newPagePromise;
      await newPage.waitForLoadState();
      
      const url = newPage.url();
      expect(url).toContain('/session.html');
      
      await newPage.close();
    });
  });
});