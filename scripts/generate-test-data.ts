/**
 * 生成测试数据脚本
 * 用于创建多个项目、会话和日志数据用于测试
 */

import { sequelize } from '../src/config/database';
import { Log } from '../src/models/Log';
import { Project } from '../src/models/Project';
import { v4 as uuidv4 } from 'uuid';

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

// 生成测试项目
async function createTestProjects() {
  console.log('创建测试项目...');
  
  const projects = [
    {
      uuid: uuidv4(),
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
      uuid: uuidv4(),
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
      uuid: uuidv4(),
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

  for (const projectData of projects) {
    await Project.create(projectData as any);
  }

  console.log(`✓ 创建了 ${projects.length} 个测试项目`);
}

// 生成测试日志
async function createTestLogs() {
  console.log('生成测试日志...');
  
  const projects = await Project.findAll();
  
  if (projects.length === 0) {
    console.error('没有找到项目，请先创建项目');
    return;
  }

  let totalLogs = 0;

  // 为每个项目生成日志
  for (const project of projects) {
    console.log(`\n为项目 "${project.name}" (ID: ${project.id}) 生成日志...`);
    
    // 每个项目生成 3-5 个会话
    const sessionCount = 3 + Math.floor(Math.random() * 3);
    
    for (let s = 0; s < sessionCount; s++) {
      const sessionUuid = uuidv4();
      const deviceUuid = uuidv4();
      const sessionDate = getRandomDate(7); // 最近7天内
      
      // 每个会话生成 10-30 条日志
      const logCount = 10 + Math.floor(Math.random() * 21);
      
      const logs: any[] = [];
      
      for (let i = 0; i < logCount; i++) {
        const logDate = new Date(sessionDate.getTime() + i * 1000 * 60); // 每条日志间隔1分钟
        
        // 根据项目类型生成不同的日志
        let logKey: string;
        let logValue: string;
        let dataType: 'record' | 'warning' | 'error';
        
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
        if (project.id === 1) {
          // 智能家居系统
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
        } else if (project.id === 2) {
          // 工业传感器网络
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
          // 车联网平台
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

        logs.push({
          deviceUuid,
          sessionUuid,
          projectId: project.id,
          clientIp: `192.168.1.${Math.floor(Math.random() * 255)}`,
          dataType,
          logKey,
          logValue,
          clientTimestamp: logDate.getTime(),
          createdAt: logDate
        });
      }

      // 批量插入日志
      await Log.bulkCreate(logs);
      totalLogs += logs.length;
      
      console.log(`  ✓ 会话 ${s + 1}/${sessionCount}: ${logs.length} 条日志`);
    }
  }

  console.log(`\n✓ 总共生成了 ${totalLogs} 条测试日志`);
}

// 主函数
async function main() {
  try {
    console.log('开始生成测试数据...\n');
    
    // 连接数据库
    await sequelize.authenticate();
    console.log('✓ 数据库连接成功\n');

    // 清空现有数据（可选）
    const clearData = process.argv.includes('--clear');
    if (clearData) {
      console.log('清空现有数据...');
      await Log.destroy({ where: {} });
      await Project.destroy({ where: {} });
      console.log('✓ 数据已清空\n');
    }

    // 创建测试项目
    await createTestProjects();

    // 生成测试日志
    await createTestLogs();

    console.log('\n✓ 测试数据生成完成！');
    console.log('\n可以访问以下页面查看数据：');
    console.log('- 项目列表: http://localhost:3000');
    console.log('- 项目报表: http://localhost:3000/session.html?projectId=1');
    
  } catch (error) {
    console.error('生成测试数据失败:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// 运行脚本
main();
