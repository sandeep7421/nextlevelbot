"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Contact extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Contact.init(
    {
        name             : DataTypes.STRING,
        ext_user_id : DataTypes.INTEGER,
        email            : DataTypes.STRING,
        phone            : DataTypes.STRING,
        company          : DataTypes.STRING,
        country          : DataTypes.STRING,
        city             : DataTypes.STRING,
        region           : DataTypes.STRING,
        tags             : DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "Contact",
      timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
      underscored: true,
    }
  );
  return Contact;
};