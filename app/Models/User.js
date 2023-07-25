'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    toJSON() {
      const values = { ...this.get() };
      delete values.password; // Exclude the password field
      return values;
    }
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  };

  User.init({
    name: {
      type: DataTypes.STRING(191),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(191),
      allowNull: false,
    },
    phone: {
      type: DataTypes.STRING(191),
      defaultValue: null,
    },
    country_code: {
      type: DataTypes.STRING(11),
      defaultValue: null,
    },
    referal_code: {
      type: DataTypes.STRING(191),
      defaultValue: null,
    },
    profile_pic: {
      type: DataTypes.TEXT,
      defaultValue: null,
    },
    address: {
      type: DataTypes.TEXT,
      defaultValue: null,
    },
    status: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    count_referal: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    referal_user: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    referral_status: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    email_verified_at: {
      type: DataTypes.DATE,
      defaultValue: null,
    },
    otp: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: 0,
    },
    password: {
      type: DataTypes.STRING(191),
      allowNull: false,
    },
    telegram_id: {
      type: DataTypes.TEXT,
      defaultValue: null,
    },
    nlbalgobot_chat_id: {
      type: DataTypes.STRING(121),
      defaultValue: null,
    },
    isstaff: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: 0,
    },
    google_id: {
      type: DataTypes.STRING(191),
      defaultValue: null,
    },
    facebook_id: {
      type: DataTypes.STRING(191),
      defaultValue: null,
    },
    yahoo_id: {
      type: DataTypes.TEXT,
      defaultValue: null,
    },
    twitter_id: {
      type: DataTypes.TEXT,
      defaultValue: null,
    },
    github_id: {
      type: DataTypes.TEXT,
      defaultValue: null,
    },
    apple_id: {
      type: DataTypes.TEXT,
      defaultValue: null,
    },
    social_info: {
      type: DataTypes.TEXT('long'),
      defaultValue: null,
      charset: 'utf8mb4',
      collate: 'utf8mb4_bin',
    },
    gst_details: {
      type: DataTypes.TEXT('long'),
      defaultValue: null,
      charset: 'utf8mb4',
      collate: 'utf8mb4_bin',
    },
    remember_token: {
      type: DataTypes.STRING(100),
      defaultValue: null,
    },
    last_login_ip: {
      type: DataTypes.TEXT,
      defaultValue: null,
    },
    last_login_time: {
      type: DataTypes.DATE,
      defaultValue: null,
    },
    phone_verified_at: {
      type: DataTypes.DATE,
      defaultValue: null,
    },
  }, 
  {
    sequelize,
    modelName: 'User',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    underscored: true
  },
  );
 
  return User;
};