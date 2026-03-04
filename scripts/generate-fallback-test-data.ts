/**
 * 生成用于测试"默认值回填"功能的测试数据
 * 
 * 场景：同一个硬件设备(deviceUuid)有多个会话，
 * 后面的会话缺少某些 key 的数据，页面应该用灰色显示上一个会话的值。
 * 
 * 项目ID: 10
 * 日期: 2026-03-04
 */

const API_BASE = 'http://localhost:3000/api/v1';
const AUTH_KEY = process.env.AUTH_KEY || '123456';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

async function post(url: string, body: any, headers: Record<string, string> = {}) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  return res;
}

async function createLog(projectId: number, deviceUuid: string, sessionUuid: string, dataType: string, key: string, value: string, timestamp: number, userName?: string) {
  const res = await post(`${API_BASE}/logs`, {
    deviceUuid, sessionUuid, projectId, dataType, key, value, timestamp, userName,
  }, { 'X-Auth-Key': AUTH_KEY });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`创建日志失败: ${text}`);
  }
  return res.json();
}

async function ensureProject() {
  // 检查项目10是否存在
  const listRes = await fetch(`${API_BASE}/projects`);
  const listData: any = await listRes.json();
  const projects = listData.success ? listData.data : listData;
  const exists = projects.find((p: any) => p.id === 10);
  if (exists) {
    console.log('项目10已存在，跳过创建');
    return;
  }

  // 获取admin token
  const loginRes = await post(`${API_BASE}/admin/login`, { password: ADMIN_PASSWORD });
  if (!loginRes.ok) {
    console.log('管理员登录失败，尝试直接创建项目...');
  }
  const loginData: any = await loginRes.json();
  const token = loginData.token;

  const createRes = await post(`${API_BASE}/projects`, {
    id: 10,
    uuid: 'test-fallback-project-10',
    name: '默认值回填测试项目',
  }, { 'Authorization': `Bearer ${token}` });

  if (!createRes.ok) {
    const text = await createRes.text();
    console.warn('创建项目失败(可能已存在):', text);
  } else {
    console.log('✓ 项目10创建成功');
  }
}

async function main() {
  console.log('=== 生成默认值回填测试数据 ===\n');

  await ensureProject();

  const baseDate = new Date('2026-03-04T08:00:00.000Z');

  // 定义两个硬件设备
  const DEVICE_A = 'HW-TEST-FALLBACK-DEVICE-A';
  const DEVICE_B = 'HW-TEST-FALLBACK-DEVICE-B';

  // 定义数据 keys (供参考)
  // ALL_KEYS: ['型号', '固件版本', '温度', '湿度', 'IP地址', '电池电量', '信号强度']

  // ========== 设备A：3个会话 ==========
  // 会话1 (08:00): 所有 key 都有值
  const sessionA1 = uuid();
  // 会话2 (10:00): 缺少 "固件版本"、"IP地址"、"电池电量"
  const sessionA2 = uuid();
  // 会话3 (14:00): 缺少 "型号"、"温度"、"信号强度"、"电池电量"
  const sessionA3 = uuid();

  // ========== 设备B：2个会话 ==========
  // 会话1 (09:00): 所有 key 都有值
  const sessionB1 = uuid();
  // 会话2 (12:00): 缺少 "型号"、"湿度"、"信号强度"
  const sessionB2 = uuid();

  const data = [
    // --- 设备A 会话1 (08:00) - 完整数据 ---
    { device: DEVICE_A, session: sessionA1, time: 0, key: '型号', value: 'Model-X100', user: '张三' },
    { device: DEVICE_A, session: sessionA1, time: 1, key: '固件版本', value: 'v2.1.0', user: '张三' },
    { device: DEVICE_A, session: sessionA1, time: 2, key: '温度', value: '25.3°C', user: '张三' },
    { device: DEVICE_A, session: sessionA1, time: 3, key: '湿度', value: '60.5%', user: '张三' },
    { device: DEVICE_A, session: sessionA1, time: 4, key: 'IP地址', value: '192.168.1.100', user: '张三' },
    { device: DEVICE_A, session: sessionA1, time: 5, key: '电池电量', value: '85%', user: '张三' },
    { device: DEVICE_A, session: sessionA1, time: 6, key: '信号强度', value: '-45dBm', user: '张三' },

    // --- 设备A 会话2 (10:00) - 缺少 固件版本、IP地址、电池电量 ---
    { device: DEVICE_A, session: sessionA2, time: 120, key: '型号', value: 'Model-X100', user: '张三' },
    // 固件版本: 缺失 → 应回填 v2.1.0
    { device: DEVICE_A, session: sessionA2, time: 122, key: '温度', value: '26.8°C', user: '张三' },
    { device: DEVICE_A, session: sessionA2, time: 123, key: '湿度', value: '58.2%', user: '张三' },
    // IP地址: 缺失 → 应回填 192.168.1.100
    // 电池电量: 缺失 → 应回填 85%
    { device: DEVICE_A, session: sessionA2, time: 126, key: '信号强度', value: '-42dBm', user: '张三' },

    // --- 设备A 会话3 (14:00) - 缺少 型号、温度、信号强度、电池电量 ---
    // 型号: 缺失 → 应回填 Model-X100 (来自会话2)
    { device: DEVICE_A, session: sessionA3, time: 360, key: '固件版本', value: 'v2.2.0', user: '李四' },
    // 温度: 缺失 → 应回填 26.8°C (来自会话2)
    { device: DEVICE_A, session: sessionA3, time: 363, key: '湿度', value: '55.0%', user: '李四' },
    { device: DEVICE_A, session: sessionA3, time: 364, key: 'IP地址', value: '192.168.1.101', user: '李四' },
    // 电池电量: 缺失 → 应回填 85% (来自会话1，因为会话2也没有)
    // 信号强度: 缺失 → 应回填 -42dBm (来自会话2)

    // --- 设备B 会话1 (09:00) - 完整数据 ---
    { device: DEVICE_B, session: sessionB1, time: 60, key: '型号', value: 'Model-Y200', user: '王五' },
    { device: DEVICE_B, session: sessionB1, time: 61, key: '固件版本', value: 'v3.0.1', user: '王五' },
    { device: DEVICE_B, session: sessionB1, time: 62, key: '温度', value: '22.1°C', user: '王五' },
    { device: DEVICE_B, session: sessionB1, time: 63, key: '湿度', value: '70.3%', user: '王五' },
    { device: DEVICE_B, session: sessionB1, time: 64, key: 'IP地址', value: '192.168.1.200', user: '王五' },
    { device: DEVICE_B, session: sessionB1, time: 65, key: '电池电量', value: '92%', user: '王五' },
    { device: DEVICE_B, session: sessionB1, time: 66, key: '信号强度', value: '-38dBm', user: '王五' },

    // --- 设备B 会话2 (12:00) - 缺少 型号、湿度、信号强度 ---
    // 型号: 缺失 → 应回填 Model-Y200
    { device: DEVICE_B, session: sessionB2, time: 240, key: '固件版本', value: 'v3.0.2', user: '王五' },
    { device: DEVICE_B, session: sessionB2, time: 242, key: '温度', value: '23.5°C', user: '王五' },
    // 湿度: 缺失 → 应回填 70.3%
    { device: DEVICE_B, session: sessionB2, time: 244, key: 'IP地址', value: '192.168.1.201', user: '王五' },
    { device: DEVICE_B, session: sessionB2, time: 245, key: '电池电量', value: '88%', user: '王五' },
    // 信号强度: 缺失 → 应回填 -38dBm
  ];

  let count = 0;
  // 按会话分组，每组之间加延迟以确保 createdAt 不同
  const sessionGroups = [
    // 设备A 会话1 (最早)
    data.filter(d => d.session === sessionA1),
    // 设备B 会话1
    data.filter(d => d.session === sessionB1),
    // 设备A 会话2
    data.filter(d => d.session === sessionA2),
    // 设备B 会话2
    data.filter(d => d.session === sessionB2),
    // 设备A 会话3 (最晚)
    data.filter(d => d.session === sessionA3),
  ];

  for (const group of sessionGroups) {
    for (const d of group) {
      const ts = baseDate.getTime() + d.time * 60 * 1000;
      try {
        await createLog(10, d.device, d.session, 'record', d.key, d.value, ts, d.user);
        count++;
      } catch (e: any) {
        console.error(`  ✗ ${d.key}: ${e.message}`);
      }
    }
    // 每组之间等待1.5秒，确保 createdAt 有明显差异
    await new Promise(r => setTimeout(r, 1500));
    console.log(`  ✓ 已插入一组会话数据 (累计 ${count} 条)`);
  }

  console.log(`\n✓ 成功创建 ${count} 条日志`);
  console.log('\n数据结构说明：');
  console.log('  设备A (3个会话): 会话1完整 → 会话2缺3项 → 会话3缺4项');
  console.log('  设备B (2个会话): 会话1完整 → 会话2缺3项');
  console.log('\n查看报表：');
  console.log('  http://localhost:3000/session.html?projectId=10&startDate=2026-03-04&endDate=2026-03-04');
}

main().catch(console.error);
