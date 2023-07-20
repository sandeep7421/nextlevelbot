'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Session extends Model {
        /**
         * Helper method for defining associations.
         * This method is not a part of Sequelize lifecycle.
         * The `models/index` file will call this method automatically.
         */
        static associate(models) {
            this.myAssociation=models.Session.belongsTo(models.Contact, { as: 'contact', foreignKey: "contact_id"});
            this.myAssociation=models.Session.hasMany(models.SessionLead, { as: 'session_lead', foreignKey: "session_id"});
            models.Session.belongsTo(models.Project , {foreignKey : "project_id",as:"project_session"})
            models.Session.hasMany(models.SessionMessage , {foreignKey : "session_id",as:"session_messages"})
            models.Session.hasMany(models.SessionWebsiteNavigation , {foreignKey : "session_id",as:"SessionWebsiteNavigation"})
            models.Session.belongsTo(models.ChatbotIntegrationsSetting , {targetKey: 'project_id',foreignKey : "project_id",as:"ChatbotIntegrationsSetting"})
            models.Session.hasMany(models.ShareLinkIntegrationSetting , {sourceKey : "project_id",foreignKey : "project_id"})
        }
    };
    Session.init({
        project_id :DataTypes.INTEGER,
        integration_id: DataTypes.INTEGER,
        status: DataTypes.ENUM('open','closed'),
        device_type: DataTypes.ENUM('desktop','mobile'),
        platform: DataTypes.ENUM('android', 'ios', 'window', 'linux','mac'),
        ip: DataTypes.STRING,
        country: DataTypes.STRING,
        session_uid:DataTypes.STRING,
        contact_id : DataTypes.INTEGER,
        is_notified: DataTypes.INTEGER
    }, {
        sequelize,
        modelName: 'Session',
        tableName: 'session',
        timestamps: { createdAt: 'created_at', updatedAt: 'updated_at'},
        underscored: true,
    });
    return Session;
};