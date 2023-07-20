'use strict';
const {
  Model,Integration,Project
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class ProjectIntegration extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      this.myAssociation=models.ProjectIntegration.hasOne(models. ChatbotIntegrationsSetting, { as:'chatbotIntegrationsSetting', foreignKey: "project_id"});
      this.myAssociation=models.ProjectIntegration.hasOne(models. DiscordIntegrationsSetting, { as:'discordIntegrationsSetting', foreignKey: "project_id"});
      this.myAssociation=models.ProjectIntegration.hasOne(models. SlackIntegrationsSetting, { as:'slackIntegrationsSetting', foreignKey: "project_id"});
    }
  };
  ProjectIntegration.init({
    project_id        : {
      type: DataTypes.INTEGER,
      field: 'project_id',
      references: {
        model: Project,
        key: 'id'
      }
    },
    integration_id    : {
      type: DataTypes.INTEGER,
      field: 'integration_id',
      references: {
        model: Integration,
        key: 'id'
      }
    }
  }, {
    sequelize,
      modelName: 'ProjectIntegration',
      timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
      underscored: true,

  });
  return ProjectIntegration;
};