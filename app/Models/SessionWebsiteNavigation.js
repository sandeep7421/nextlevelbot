"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class SessionWebsiteNavigation extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  SessionWebsiteNavigation.init(
    {
        session_id: DataTypes.INTEGER,
        url : DataTypes.STRING
    },
    {
      sequelize,
      modelName: "SessionWebsiteNavigation",
      timestamps: { createdAt: "created_at" },
      underscored: true,
      updatedAt : false
    }
  );
  return SessionWebsiteNavigation;
};