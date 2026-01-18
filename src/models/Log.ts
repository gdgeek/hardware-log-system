import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import { DataType } from '../types';

/**
 * Log model attributes interface
 */
export interface LogAttributes {
  id: number;
  deviceUuid: string;
  dataType: DataType;
  logKey: string;
  logValue: object;
  createdAt: Date;
}

/**
 * Optional attributes for Log creation (id and createdAt are auto-generated)
 */
export interface LogCreationAttributes extends Optional<LogAttributes, 'id' | 'createdAt'> {}

/**
 * Log model class
 * Represents a log entry in the database
 */
export class Log extends Model<LogAttributes, LogCreationAttributes> implements LogAttributes {
  declare id: number;
  declare deviceUuid: string;
  declare dataType: DataType;
  declare logKey: string;
  declare logValue: object;
  declare createdAt: Date;

  /**
   * Helper method to convert model instance to plain object
   */
  toJSON(): LogAttributes {
    return {
      id: this.id,
      deviceUuid: this.deviceUuid,
      dataType: this.dataType,
      logKey: this.logKey,
      logValue: this.logValue,
      createdAt: this.createdAt,
    };
  }
}

/**
 * Initialize the Log model with schema definition
 */
Log.init(
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      comment: 'Primary key, auto-incrementing log ID',
    },
    deviceUuid: {
      type: DataTypes.STRING(36),
      allowNull: false,
      field: 'device_uuid',
      comment: 'UUID of the device that generated the log',
      validate: {
        notEmpty: {
          msg: 'Device UUID cannot be empty',
        },
        len: {
          args: [1, 36],
          msg: 'Device UUID must be between 1 and 36 characters',
        },
      },
    },
    dataType: {
      type: DataTypes.ENUM('record', 'warning', 'error'),
      allowNull: false,
      field: 'data_type',
      comment: 'Type of log entry: record, warning, or error',
      validate: {
        isIn: {
          args: [['record', 'warning', 'error']],
          msg: 'Data type must be one of: record, warning, error',
        },
      },
    },
    logKey: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'log_key',
      comment: 'Key identifier for the log entry',
      validate: {
        notEmpty: {
          msg: 'Log key cannot be empty',
        },
        len: {
          args: [1, 255],
          msg: 'Log key must be between 1 and 255 characters',
        },
      },
    },
    logValue: {
      type: DataTypes.JSON,
      allowNull: false,
      field: 'log_value',
      comment: 'JSON value containing log data',
      validate: {
        isValidJSON(value: unknown) {
          if (typeof value !== 'object' || value === null) {
            throw new Error('Log value must be a valid JSON object');
          }
        },
      },
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
      comment: 'Timestamp when the log was created',
    },
  },
  {
    sequelize,
    tableName: 'logs',
    timestamps: false, // We manage createdAt manually
    indexes: [
      {
        name: 'idx_device_uuid',
        fields: ['device_uuid'],
        comment: 'Index for querying logs by device UUID',
      },
      {
        name: 'idx_data_type',
        fields: ['data_type'],
        comment: 'Index for querying logs by data type',
      },
      {
        name: 'idx_created_at',
        fields: ['created_at'],
        comment: 'Index for querying logs by creation time',
      },
      {
        name: 'idx_device_type',
        fields: ['device_uuid', 'data_type'],
        comment: 'Composite index for querying logs by device and type',
      },
      {
        name: 'idx_device_time',
        fields: ['device_uuid', 'created_at'],
        comment: 'Composite index for querying logs by device and time',
      },
    ],
    comment: 'Table storing hardware device logs',
  }
);

export default Log;
