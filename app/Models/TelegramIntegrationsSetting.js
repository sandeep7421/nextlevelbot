"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class TelegramIntegrationsSetting extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  TelegramIntegrationsSetting.init(
    {
      project_id: DataTypes.INTEGER,
      telegram_user_id: DataTypes.INTEGER
    },
    {
      sequelize,
      modelName: "TelegramIntegrationsSetting",
      tableName: "telegram_integrations_settings",
      timestamps: false,
      underscored: true,
    }
  );
  return TelegramIntegrationsSetting;
};