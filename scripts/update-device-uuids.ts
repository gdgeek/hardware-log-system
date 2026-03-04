/**
 * 更新已有数据库中日志的 device_uuid 为可识别的硬件风格ID
 * 按 session_uuid 分组，同一会话使用同一个 device_uuid
 */

import { sequelize } from '../src/config/database';
import { QueryTypes } from 'sequelize';

// 每个项目的硬件UUID映射
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

async function main() {
  try {
    await sequelize.authenticate();
    console.log('✓ 数据库连接成功\n');

    // 获取所有不同的 project_id
    const projectIds = await sequelize.query<{ project_id: number }>(
      'SELECT DISTINCT project_id FROM logs ORDER BY project_id',
      { type: QueryTypes.SELECT }
    );

    console.log(`找到 ${projectIds.length} 个项目\n`);

    for (const { project_id: projectId } of projectIds) {
      // 获取该项目下所有不同的 session_uuid，按最早创建时间排序
      const sessions = await sequelize.query<{ session_uuid: string }>(
        'SELECT session_uuid, MIN(created_at) as first_time FROM logs WHERE project_id = :projectId GROUP BY session_uuid ORDER BY first_time',
        { replacements: { projectId }, type: QueryTypes.SELECT }
      );

      console.log(`项目 ${projectId}: ${sessions.length} 个会话`);

      const uuids = projectDeviceUuids[projectId];

      for (let i = 0; i < sessions.length; i++) {
        const sessionUuid = sessions[i].session_uuid;
        let deviceUuid: string;

        if (uuids) {
          deviceUuid = uuids[i % uuids.length];
        } else {
          // 其他项目使用通用格式
          const idx = String(i + 1).padStart(3, '0');
          const hash = sessionUuid.replace(/-/g, '').substring(0, 8).toUpperCase();
          deviceUuid = `HW-DEV-${idx}-${hash}`;
        }

        await sequelize.query(
          'UPDATE logs SET device_uuid = :deviceUuid WHERE session_uuid = :sessionUuid AND project_id = :projectId',
          { replacements: { deviceUuid, sessionUuid, projectId } }
        );

        console.log(`  ✓ 会话 ${i + 1}/${sessions.length}: ${sessionUuid.substring(0, 8)}... → ${deviceUuid}`);
      }
    }

    console.log('\n✓ 所有 device_uuid 更新完成');
  } catch (error) {
    console.error('更新失败:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

main();
