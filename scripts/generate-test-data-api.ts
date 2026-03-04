/**
 * 通过 API 生成测试数据脚本
 * 使用 HTTP API 而不是直接操作数据库
 */

import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';

const API_BASE = 'http://localhost:3000/api/v1';
const AUTH_KEY = process.env.AUTH_KEY || '123456';

// 生成随机日期（最近N天内）
function getRandomDate(daysAgo: number): Date {
  const now = new Date();
  const randomDays = Math.floor(Math.random() * daysAgo);
  const randomHours = Math.floor(Math.random() * 24);
  const randomMinutes = Math.floor(Math.random() * 60);
  
  const date = new Date(now);
  date.setDate(date.getDate() - randomDays);
  date.setHours(randomHours, randomMinutes, 0, 0);
  
  return date;
}

// 创建日志
async function createLog(projectId: number, deviceUuid: string, sessionUuid: string, dataType: string, key: string, value: string, timestamp: number, userName?: string) {
  const response = await fetch(`${API_BASE}/logs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Auth-Key': AUTH_KEY
    },
    body: JSON.stringify({
      deviceUuid,
      sessionUuid,
      projectId,
      dataType,
      key,
      value,
      timestamp,
      userName
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

    // 项目配置（假设项目已存在，ID为1, 2, 3）
    const projects = [
      {
        id: 1,
        name: '智能家居系统',
        keys: ['device_type', 'firmware_version', 'temperature', 'humidity', 'status'],
        values: [
          ['温控器', '空调', '灯光', '窗帘'],
          ['v1.2.3', 'v1.2.4', 'v1.3.0'],
          () => `${(20 + Math.random() * 10).toFixed(1)}°C`,
          () => `${(40 + Math.random() * 30).toFixed(1)}%`,
          ['正常', '运行中', '待机', '离线']
        ],
        errorKeys: ['error_message'],
        errorValues: [['连接超时', '传感器故障', '电源异常']],
        warningKeys: ['warning_message'],
        warningValues: [['温度偏高', '湿度异常', '信号弱']],
        userNames: ['张三', '李四', '王五', '赵六']
      },
      {
        id: 2,
        name: '工业传感器网络',
        keys: ['sensor_id', 'pressure', 'flow_rate', 'alarm_level'],
        values: [
          ['S001', 'S002', 'S003', 'S004'],
          () => `${(100 + Math.random() * 50).toFixed(2)} kPa`,
          () => `${(10 + Math.random() * 20).toFixed(2)} L/min`,
          ['0', '1', '2']
        ],
        errorKeys: ['error_code'],
        errorValues: [['E001', 'E002', 'E003']],
        warningKeys: ['warning_code'],
        warningValues: [['W001', 'W002', 'W003']],
        userNames: ['操作员A', '操作员B', '操作员C']
      },
      {
        id: 3,
        name: '车联网平台',
        keys: ['vehicle_id', 'speed', 'location', 'fuel_level'],
        values: [
          ['V001', 'V002', 'V003'],
          () => `${Math.floor(Math.random() * 120)} km/h`,
          () => `${(116 + Math.random()).toFixed(6)},${(39 + Math.random()).toFixed(6)}`,
          () => `${Math.floor(Math.random() * 100)}%`
        ],
        errorKeys: ['error_type'],
        errorValues: [['引擎故障', '刹车异常', 'GPS失联']],
        warningKeys: ['warning_type'],
        warningValues: [['油量低', '轮胎压力低', '保养提醒']],
        userNames: ['司机甲', '司机乙', '司机丙']
      }
    ];

    // 为每个项目预定义一组可识别的硬件设备UUID
    const projectDeviceUuids: Record<number, string[]> = {
      1: [
        'HW-HOME-001-A1B2C3D4',
        'HW-HOME-002-E5F6A7B8',
        'HW-HOME-003-C9D0E1F2',
        'HW-HOME-004-A3B4C5D6',
        'HW-HOME-005-E7F8A9B0',
      ],
      2: [
        'HW-SENSOR-001-1A2B3C4D',
        'HW-SENSOR-002-5E6F7A8B',
        'HW-SENSOR-003-9C0D1E2F',
        'HW-SENSOR-004-3A4B5C6D',
        'HW-SENSOR-005-7E8F9A0B',
      ],
      3: [
        'HW-VEHICLE-001-A1B2C3D4',
        'HW-VEHICLE-002-E5F6A7B8',
        'HW-VEHICLE-003-C9D0E1F2',
        'HW-VEHICLE-004-A3B4C5D6',
        'HW-VEHICLE-005-E7F8A9B0',
      ],
    };

    let totalLogs = 0;

    // 为每个项目生成日志
    for (const project of projects) {
      console.log(`为项目 "${project.name}" (ID: ${project.id}) 生成日志...`);
      
      const deviceUuids = projectDeviceUuids[project.id] || [];
      
      // 每个项目生成 3-5 个会话
      const sessionCount = 3 + Math.floor(Math.random() * 3);
      
      for (let s = 0; s < sessionCount; s++) {
        const sessionUuid = uuidv4();
        const deviceUuid = deviceUuids[s % deviceUuids.length] || uuidv4();
        const sessionDate = getRandomDate(7); // 最近7天内
        const userName = project.userNames[Math.floor(Math.random() * project.userNames.length)];
        
        // 每个会话生成 10-30 条日志
        const logCount = 10 + Math.floor(Math.random() * 21);
        
        for (let i = 0; i < logCount; i++) {
          const logDate = new Date(sessionDate.getTime() + i * 1000 * 60); // 每条日志间隔1分钟
          
          let logKey: string;
          let logValue: string;
          let dataType: 'record' | 'warning' | 'error';
          
          // 90% 是 record，8% 是 warning，2% 是 error
          const rand = Math.random();
          if (rand < 0.9) {
            dataType = 'record';
            const keyIndex = i % project.keys.length;
            logKey = project.keys[keyIndex];
            const valueItem = project.values[keyIndex];
            if (typeof valueItem === 'function') {
              logValue = valueItem();
            } else {
              logValue = valueItem[Math.floor(Math.random() * valueItem.length)];
            }
          } else if (rand < 0.98) {
            dataType = 'warning';
            const keyIndex = Math.floor(Math.random() * project.warningKeys.length);
            logKey = project.warningKeys[keyIndex];
            logValue = project.warningValues[keyIndex][Math.floor(Math.random() * project.warningValues[keyIndex].length)];
          } else {
            dataType = 'error';
            const keyIndex = Math.floor(Math.random() * project.errorKeys.length);
            logKey = project.errorKeys[keyIndex];
            logValue = project.errorValues[keyIndex][Math.floor(Math.random() * project.errorValues[keyIndex].length)];
          }

          try {
            await createLog(
              project.id,
              deviceUuid,
              sessionUuid,
              dataType,
              logKey,
              logValue,
              logDate.getTime(),
              userName
            );
            totalLogs++;
          } catch (error: any) {
            console.error(`  创建日志失败: ${error.message}`);
          }
        }
        
        console.log(`  ✓ 会话 ${s + 1}/${sessionCount}: ${logCount} 条日志 (用户: ${userName})`);
      }
    }

    console.log(`\n✓ 总共生成了 ${totalLogs} 条测试日志`);
    console.log('\n可以访问以下页面查看数据：');
    console.log('- 项目列表: http://localhost:3000');
    console.log('- 项目报表: http://localhost:3000/session.html?projectId=1');
    console.log('- 项目报表: http://localhost:3000/session.html?projectId=2');
    console.log('- 项目报表: http://localhost:3000/session.html?projectId=3');
    
  } catch (error) {
    console.error('生成测试数据失败:', error);
    process.exit(1);
  }
}

// 运行脚本
main();
