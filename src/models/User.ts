import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/database";

/**
 * User model attributes interface
 */
export interface UserAttributes {
  id: number;
  username: string;
  passwordHash?: string;
  role: "admin" | "viewer";
  lastLoginAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Optional attributes for User creation
 */
export interface UserCreationAttributes extends Optional<
  UserAttributes,
  "id" | "lastLoginAt" | "role"
> {}

/**
 * User model class
 */
export class User
  extends Model<UserAttributes, UserCreationAttributes>
  implements UserAttributes
{
  declare id: number;
  declare username: string;
  declare passwordHash: string;
  declare role: "admin" | "viewer";
  declare lastLoginAt: Date | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  /**
   * Helper method to convert model instance to plain object
   */
  toJSON(): UserAttributes {
    const values = { ...this.get() };
    delete values.passwordHash; // Never return password hash in JSON
    return values;
  }
}

User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    username: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        len: [3, 50],
      },
    },
    passwordHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: "password_hash",
    },
    role: {
      type: DataTypes.ENUM("admin", "viewer"),
      allowNull: false,
      defaultValue: "admin",
    },
    lastLoginAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "last_login_at",
    },
  },
  {
    sequelize,
    tableName: "users",
    timestamps: true,
    underscored: true,
    comment: "Table storing management users for the UI",
  },
);

export default User;
