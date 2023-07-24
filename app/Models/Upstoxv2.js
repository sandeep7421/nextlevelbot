'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Upstoxv2 extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  };
  Upstoxv2.init({
    instrument_key : DataTypes.STRING,
    exchange_token : DataTypes.STRING,
    tradingsymbol : DataTypes.STRING,
    name : DataTypes.STRING,
    last_price:DataTypes.STRING,
    expiry: DataTypes.STRING,
    strike: DataTypes.STRING,
    tick_size: DataTypes.STRING,
    lot_size: DataTypes.STRING,
    instrument_type:DataTypes.STRING,
    option_type: DataTypes.STRING,
    exchange: DataTypes.STRING

  }, {
    sequelize,
    modelName: 'Upstoxv2',
    tableName: 'upstoxv2',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    underscored: true
  });
  return Upstoxv2;
};