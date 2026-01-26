import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/database";

/**
 * Project model attributes interface
 */
export interface ProjectAttributes {
  id: number;
  name: string;
  authKey: string;
  description: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Optional attributes for Project creation
 */
export interface ProjectCreationAttributes extends Optional<
  ProjectAttributes,
  "id" | "description" | "createdAt" | "updatedAt"
> {}

/**
 * Project model class
 */
export class Project
  extends Model<ProjectAttributes, ProjectCreationAttributes>
  implements ProjectAttributes
{
  declare id: number;
  declare name: string;
  declare authKey: string;
  declare description: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Project.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    authKey: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      field: "auth_key",
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      field: "created_at",
    },
    updatedAt: {
      type: DataTypes.DATE,
      field: "updated_at",
    },
  },
  {
    sequelize,
    tableName: "projects",
    timestamps: true,
  },
);

export default Project;
