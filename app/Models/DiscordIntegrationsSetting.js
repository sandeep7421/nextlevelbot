"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class DiscordIntegrationsSetting extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  DiscordIntegrationsSetting.init(
    {
      project_id: DataTypes.INTEGER,
      guild_id : DataTypes.STRING
    },
    {
      sequelize,
      modelName: "DiscordIntegrationsSetting",
      timestamps: false,
      underscored: true,
    }
  );
  return DiscordIntegrationsSetting;
};