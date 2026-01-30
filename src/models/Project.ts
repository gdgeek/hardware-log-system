/**
 * Project Model
 * 项目模型 - 管理项目信息、列映射和访问控制
 */

import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

/**
 * Project attributes interface
 */
export interface ProjectAttributes {
  id: number;
  uuid: string;
  name: string;
  authKey: string;
  password?: string | null;
  columnMapping?: Record<string, string> | null; // JSON格式的列名映射
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Project creation attributes (optional fields for creation)
 */
export interface ProjectCreationAttributes extends Optional<ProjectAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

/**
 * Project model class
 */
export class Project extends Model<ProjectAttributes, ProjectCreationAttributes> implements ProjectAttributes {
  public id!: number;
  public uuid!: string;
  public name!: string;
  public authKey!: string;
  public password!: string | null;
  public columnMapping!: Record<string, string> | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  /**
   * 检查项目是否需要密码保护
   */
  public isPasswordProtected(): boolean {
    return this.password !== null && this.password !== '';
  }

  /**
   * 验证项目密码
   */
  public validatePassword(inputPassword: string): boolean {
    if (!this.isPasswordProtected()) {
      return true; // 无密码保护的项目直接通过
    }
    return this.password === inputPassword;
  }

  /**
   * 获取列名映射，如果没有设置则返回空对象
   */
  public getColumnMapping(): Record<string, string> {
    return this.columnMapping || {};
  }

  /**
   * 映射列名到显示名称
   */
  public mapColumnName(originalName: string): string {
    const mapping = this.getColumnMapping();
    return mapping[originalName] || originalName;
  }
}

// 定义模型
Project.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
    },
    uuid: {
      type: DataTypes.STRING(36),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        len: [1, 36],
      },
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 255],
      },
    },
    authKey: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'auth_key', // 映射到数据库的 auth_key 字段
      validate: {
        notEmpty: true,
      },
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    columnMapping: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'column_mapping', // 映射到数据库的 column_mapping 字段
      validate: {
        isValidMapping(value: Record<string, string> | null | undefined) {
          if (value !== null && value !== undefined) {
            if (typeof value !== 'object' || Array.isArray(value)) {
              throw new Error('Column mapping must be an object');
            }
            // 验证所有键值都是字符串
            for (const [key, val] of Object.entries(value)) {
              if (typeof key !== 'string' || typeof val !== 'string') {
                throw new Error('Column mapping keys and values must be strings');
              }
            }
          }
        },
      },
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'updated_at',
    },
  },
  {
    sequelize,
    modelName: 'Project',
    tableName: 'projects',
    timestamps: true,
    underscored: true, // 使用下划线命名约定
    indexes: [
      {
        fields: ['uuid'],
      },
      {
        fields: ['name'],
      },
    ],
  }
);

export default Project;