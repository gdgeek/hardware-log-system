import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/database";
import { DataType } from "../types";

/**
 * Log model attributes interface
 */
export interface LogAttributes {
  id: number;
  deviceUuid: string;
  sessionUuid: string;
  projectId: number;
  clientIp: string | null;
  dataType: DataType;
  logKey: string;
  logValue: string;
  clientTimestamp: number | null;
  createdAt: Date;
}

/**
 * Optional attributes for Log creation
 */
export interface LogCreationAttributes extends Optional<
  LogAttributes,
  "id" | "createdAt" | "clientIp" | "clientTimestamp"
> {}

/**
 * Log model class
 */
export class Log
  extends Model<LogAttributes, LogCreationAttributes>
  implements LogAttributes
{
  declare id: number;
  declare deviceUuid: string;
  declare sessionUuid: string;
  declare projectId: number;
  declare clientIp: string | null;
  declare dataType: DataType;
  declare logKey: string;
  declare logValue: string;
  declare clientTimestamp: number | null;
  declare createdAt: Date;

  /**
   * Helper method to convert model instance to plain object
   */
  toJSON(): LogAttributes {
    return {
      id: this.id,
      deviceUuid: this.deviceUuid,
      sessionUuid: this.sessionUuid,
      projectId: this.projectId,
      clientIp: this.clientIp,
      dataType: this.dataType,
      logKey: this.logKey,
      logValue: this.logValue,
      clientTimestamp: this.clientTimestamp,
      createdAt: this.createdAt,
    };
  }
}

/**
 * Initialize the Log model
 */
Log.init(
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    deviceUuid: {
      type: DataTypes.STRING(36),
      allowNull: false,
      field: "device_uuid",
    },
    sessionUuid: {
      type: DataTypes.STRING(36),
      allowNull: false,
      field: "session_uuid",
    },
    projectId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "project_id",
    },
    clientIp: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: "client_ip",
    },
    dataType: {
      type: DataTypes.ENUM("record", "warning", "error"),
      allowNull: false,
      field: "data_type",
    },
    logKey: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: "log_key",
      validate: {
        notEmpty: true,
        len: [1, 255],
      },
    },
    logValue: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: "log_value",
    },
    clientTimestamp: {
      type: DataTypes.BIGINT,
      allowNull: true,
      field: "client_timestamp",
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "created_at",
    },
  },
  {
    sequelize,
    tableName: "logs",
    timestamps: false,
  },
);

export default Log;
