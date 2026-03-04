/**
 * 为项目10添加3月4日的测试数据
 */

import { sequelize } from '../src/config/database';
import { Log } from '../src/models/Log';
import { Project } from '../src/models/Project';
import { v4 as uuidv4 } from 'uuid';

// 生成指定日期的随机时间
function getRandomTimeOnDate(year: number, month: number, day: number): Date {
  const randomHour = Math.floor(Math.random() * 24);
  const randomMinute = Math.floor(Math.random() * 60);
  const randomSecond = Math.floor(Math.random() * 60);
  
  return new Date(year, month - 1, day, randomHour, randomMinute, randomSecond);
}

async function main() {
  try {
    console.log('开始为项目10添加3月4日的测试数据...\n');

    // 连接数据库
    await sequelize.authenticate();
    console.log('✓ 数据库连接成功\n');

    // 获取项目10
    const project = await Project.findByPk(10);
    if (!project) {
      console.error('❌ 项目10不存在');
      process.exit(1);
    }

    console.log(`项目信息: ${project.name} (ID: ${project.id})\n`);

    // 智能家居系统的数据配置
    const userNames = ['张三', '李四', '王五', '赵六'];
    const keys = ['device_type', 'firmware_version', 'temperature', 'humidity', 'status'];
    const values = [
      ['温控器', '空调', '灯光', '窗帘'],
      ['v1.2.3', 'v1.2.4', 'v1.3.0'],
      () => `${(20 + Math.random() * 10).toFixed(1)}°C`,
      () => `${(40 + Math.random() * 30).toFixed(1)}%`,
      ['正常', '运行中', '待机', '离线']
    ];

    let totalLogs = 0;

    // 生成3-5个会话
    const sessionCount = 3 + Math.floor(Math.random() * 3);
    console.log(`生成 ${sessionCount} 个会话的数据...\n`);

    for (let s = 0; s < sessionCount; s++) {
      const sessionUuid = uuidv4();
      const deviceUuid = uuidv4();
      const userName = userNames[Math.floor(Math.random() * userNames.length)];
      
      // 每个会话生成15-30条日志
      const logCount = 15 + Math.floor(Math.random() * 16);
      
      const logs: any[] = [];
      
      // 生成会话的基准时间（3月4日的某个时间）
      const baseTime = getRandomTimeOnDate(2026, 3, 4);
      
      for (let i = 0; i < logCount; i++) {
        // 每条日志间隔1-5分钟
        const logTime = new Date(baseTime.getTime() + i * (60000 + Math.random() * 240000));
        
        // 90% 是 record，8% 是 warning，2% 是 error
        let dataType: 'record' | 'warning' | 'error';
        const rand = Math.random();
        if (rand < 0.9) {
          dataType = 'record';
        } else if (rand < 0.98) {
          dataType = 'warning';
        } else {
          dataType = 'error';
        }

        let logKey: string;
        let logValue: string;

        if (dataType === 'error') {
          logKey = 'error_message';
          logValue = ['连接超时', '传感器故障', '电源异常'][Math.floor(Math.random() * 3)];
        } else if (dataType === 'warning') {
          logKey = 'warning_message';
          logValue = ['温度偏高', '湿度异常', '信号弱'][Math.floor(Math.random() * 3)];
        } else {
          const keyIndex = i % keys.length;
          logKey = keys[keyIndex];
          const valueOptions = values[keyIndex];
          if (typeof valueOptions === 'function') {
            logValue = valueOptions();
          } else {
            logValue = valueOptions[Math.floor(Math.random() * valueOptions.length)];
          }
        }

        logs.push({
          deviceUuid,
          sessionUuid,
          projectId: project.id,
          userName,
          clientIp: `192.168.1.${Math.floor(Math.random() * 255)}`,
          dataType,
          logKey,
          logValue,
          clientTimestamp: logTime.getTime(),
          createdAt: logTime
        });
      }

      // 批量插入日志
      await Log.bulkCreate(logs);
      totalLogs += logs.length;
      
      console.log(`  ✓ 会话 ${s + 1}/${sessionCount}: ${logs.length} 条日志 (用户: ${userName}, 时间: ${baseTime.toLocaleString('zh-CN')})`);
    }

    console.log(`\n✓ 成功为项目10添加了 ${totalLogs} 条3月4日的测试日志\n`);

    // 显示统计信息
    const stats = await sequelize.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count,
        COUNT(DISTINCT session_uuid) as sessions,
        COUNT(DISTINCT user_name) as users
      FROM logs 
      WHERE project_id = 10 
      GROUP BY DATE(created_at)
      ORDER BY date DESC
      LIMIT 5
    `, { type: 'SELECT' });

    console.log('项目10最近的数据统计：');
    console.table(stats);

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ 生成数据失败:', error);
    await sequelize.close();
    process.exit(1);
  }
}

main();
