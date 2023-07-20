'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class SessionMessage extends Model {
        /**
         * Helper method for defining associations.
         * This method is not a part of Sequelize lifecycle.
         * The `models/index` file will call this method automatically.
         */
        static associate(models) {
            models.Session.hasMany(models.SessionMessage , {foreignKey : "session_id",as:"message"})
        }
    };
    SessionMessage.init({
        session_id: DataTypes.INTEGER,
        send_by: DataTypes.ENUM('user','assistant'),
        rate:DataTypes.ENUM('0','1'),
        message: DataTypes.TEXT,
        type:DataTypes.INTEGER,
        seen: DataTypes.ENUM('0','1')
    }, {
        sequelize,
        modelName: 'SessionMessage',
        timestamps: { createdAt: 'created_at'},
        updatedAt: false,
        underscored: true,
    });
    return SessionMessage;
};