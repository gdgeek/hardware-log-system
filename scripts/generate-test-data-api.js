/**
 * 通过 API 生成测试数据脚本
 * 使用 HTTP API 而不是直接操作数据库
 */

const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');

const API_BASE = 'http://localhost:3000/api/v1';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// 获取管理员 token
async function getAdminToken() {
  const response = await fetch(`${API_BASE}/admin/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      password: ADMIN_PASSWORD
    })
  });

  if (!response.ok) {
    throw new Error('管理员登录失败');
  }

  const result = await response.json();
  return result.token;
}

// 生成随机日期（最近N天内）
function getRandomDate(daysAgo) {
  const now = new Date();
  const randomDays = Math.floor(Math.random() * daysAgo);
  const randomHours = Math.floor(Math.random() * 24);
  const randomMinutes = Math.floor(Math.random() * 60);
  
  const date = new Date(now);
  date.setDate(date.getDate() - randomDays);
  date.setHours(randomHours, randomMinutes, 0, 0);
  
  return date;
}

// 创建项目
async function createProject(token, name, description, password, columnMapping) {
  const response = await fetch(`${API_BASE}/projects`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      name,
      description,
      password,
      columnMapping
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`创建项目失败: ${error}`);
  }

  return await response.json();
}

// 创建日志
async function createLog(projectId, deviceUuid, sessionUuid, dataType, key, value, timestamp) {
  const response = await fetch(`${API_BASE}/logs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Auth-Key': process.env.AUTH_KEY || '123456'
    },
    body: JSON.stringify({
      deviceUuid,
      sessionUuid,
      projectId,
      dataType,
      key,
      value,
      timestamp
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`创建日志失败: ${error}`);
  }

  return await response.json();
}

// 主函数
async function main() {
  try {
    console.log('开始通过 API 生成测试数据...\n');

    // 创建测试项目
    console.log('创建测试项目...');
    
    const projects = [
      {
        name: '智能家居系统',
        description: '智能家居设备日志收集',
        password: null,
        columnMapping: {
          'device_type': '设备类型',
          'firmware_version': '固件版本',
          'temperature': '温度',
          'humidity': '湿度',
          'status': '状态'
        }
      },
      {
        name: '工业传感器网络',
        description: '工业传感器数据采集',
        password: 'test123',
        columnMapping: {
          'sensor_id': '传感器ID',
          'pressure': '压力',
          'flow_rate': '流量',
          'alarm_level': '报警等级'
        }
      },
      {
        name: '车联网平台',
        description: '车载设备数据监控',
        password: null,
        columnMapping: {
          'vehicle_id': '车辆ID',
          'speed': '速度',
          'location': '位置',
          'fuel_level': '油量'
        }
      }
    ];

    const createdProjects = [];
    for (const projectData of projects) {
      try {
        const result = await createProject(
          projectData.name,
          projectData.description,
          projectData.password,
          projectData.columnMapping
        );
        createdProjects.push(result.data);
        console.log(`✓ 创建项目: ${projectData.name} (ID: ${result.data.id})`);
      } catch (error) {
        console.log(`  跳过项目 "${projectData.name}": ${error.message}`);
      }
    }

    console.log(`\n✓ 创建了 ${createdProjects.length} 个测试项目\n`);

    // 为每个项目生成日志
    let totalLogs = 0;
    for (const project of createdProjects) {
      console.log(`为项目 "${project.name}" (ID: ${project.id}) 生成日志...`);
      
      // 每个项目生成 3-5 个会话
      const sessionCount = 3 + Math.floor(Math.random() * 3);
      
      for (let s = 0; s < sessionCount; s++) {
        const sessionUuid = uuidv4();
        const deviceUuid = uuidv4();
        const sessionDate = getRandomDate(7); // 最近7天内
        
        // 每个会话生成 10-30 条日志
        const logCount = 10 + Math.floor(Math.random() * 21);
        
        for (let i = 0; i < logCount; i++) {
          const logDate = new Date(sessionDate.getTime() + i * 1000 * 60); // 每条日志间隔1分钟
          
          // 根据项目类型生成不同的日志
          let logKey;
          let logValue;
          let dataType;
          
          // 90% 是 record，8% 是 warning，2% 是 error
          const rand = Math.random();
          if (rand < 0.9) {
            dataType = 'record';
          } else if (rand < 0.98) {
            dataType = 'warning';
          } else {
            dataType = 'error';
          }

          // 根据项目生成不同的日志键值
          if (project.id === 1 || project.name === '智能家居系统') {
            const keys = ['device_type', 'firmware_version', 'temperature', 'humidity', 'status'];
            const values = [
              ['温控器', '空调', '灯光', '窗帘'],
              ['v1.2.3', 'v1.2.4', 'v1.3.0'],
              [`${(20 + Math.random() * 10).toFixed(1)}°C`],
              [`${(40 + Math.random() * 30).toFixed(1)}%`],
              ['正常', '运行中', '待机', '离线']
            ];
            
            const keyIndex = i % keys.length;
            logKey = keys[keyIndex];
            
            if (dataType === 'error') {
              logKey = 'error_message';
              logValue = ['连接超时', '传感器故障', '电源异常'][Math.floor(Math.random() * 3)];
            } else if (dataType === 'warning') {
              logKey = 'warning_message';
              logValue = ['温度偏高', '湿度异常', '信号弱'][Math.floor(Math.random() * 3)];
            } else {
              logValue = values[keyIndex][Math.floor(Math.random() * values[keyIndex].length)];
            }
          } else if (project.id === 2 || project.name === '工业传感器网络') {
            const keys = ['sensor_id', 'pressure', 'flow_rate', 'alarm_level'];
            const values = [
              ['S001', 'S002', 'S003', 'S004'],
              [`${(100 + Math.random() * 50).toFixed(2)} kPa`],
              [`${(10 + Math.random() * 20).toFixed(2)} L/min`],
              ['0', '1', '2']
            ];
            
            const keyIndex = i % keys.length;
            logKey = keys[keyIndex];
            
            if (dataType === 'error') {
              logKey = 'error_code';
              logValue = ['E001', 'E002', 'E003'][Math.floor(Math.random() * 3)];
            } else if (dataType === 'warning') {
              logKey = 'warning_code';
              logValue = ['W001', 'W002', 'W003'][Math.floor(Math.random() * 3)];
            } else {
              logValue = values[keyIndex][Math.floor(Math.random() * values[keyIndex].length)];
            }
          } else {
            const keys = ['vehicle_id', 'speed', 'location', 'fuel_level'];
            const values = [
              ['V001', 'V002', 'V003'],
              [`${Math.floor(Math.random() * 120)} km/h`],
              [`${(116 + Math.random()).toFixed(6)},${(39 + Math.random()).toFixed(6)}`],
              [`${Math.floor(Math.random() * 100)}%`]
            ];
            
            const keyIndex = i % keys.length;
            logKey = keys[keyIndex];
            
            if (dataType === 'error') {
              logKey = 'error_type';
              logValue = ['引擎故障', '刹车异常', 'GPS失联'][Math.floor(Math.random() * 3)];
            } else if (dataType === 'warning') {
              logKey = 'warning_type';
              logValue = ['油量低', '轮胎压力低', '保养提醒'][Math.floor(Math.random() * 3)];
            } else {
              logValue = values[keyIndex][Math.floor(Math.random() * values[keyIndex].length)];
            }
          }

          try {
            await createLog(
              project.id,
              deviceUuid,
              sessionUuid,
              dataType,
              logKey,
              logValue,
              logDate.getTime()
            );
            totalLogs++;
          } catch (error) {
            console.error(`  创建日志失败: ${error.message}`);
          }
        }
        
        console.log(`  ✓ 会话 ${s + 1}/${sessionCount}: ${logCount} 条日志`);
      }
    }

    console.log(`\n✓ 总共生成了 ${totalLogs} 条测试日志`);
    console.log('\n可以访问以下页面查看数据：');
    console.log('- 项目列表: http://localhost:3000');
    console.log('- 项目报表: http://localhost:3000/session.html?projectId=1');
    
  } catch (error) {
    console.error('生成测试数据失败:', error);
    process.exit(1);
  }
}

// 运行脚本
main();
