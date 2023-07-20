"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class ChatbotIntegrationsSetting extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      this.myAssociation=models.ChatbotIntegrationsSetting.hasMany(models.WidgetFormField, { as: 'widget_form_field', foreignKey: "widget_id"});;
    }
  }
  ChatbotIntegrationsSetting.init(
    {
      name: DataTypes.STRING,
      project_id: DataTypes.INTEGER,
      widget_uid:DataTypes.STRING,
      language:DataTypes.STRING,
      
      logo : DataTypes.STRING,
      welcome_message: DataTypes.STRING,
      widget_color: DataTypes.STRING,
      widget_text_color: DataTypes.STRING,
      
      branding_title: DataTypes.STRING,
      branding_color: DataTypes.STRING,
      branding_link: DataTypes.STRING,
      default_questions: DataTypes.STRING,
      message_bg_color: DataTypes.STRING, 
      message_text_color: DataTypes.STRING, 
      reply_text_color: DataTypes.STRING, 
      reply_bg_color: DataTypes.STRING,
      enable_widget_form: DataTypes.BOOLEAN,
      enable_navigation_tracking: DataTypes.BOOLEAN,
      notify_to: DataTypes.STRING,
      base_prompt: DataTypes.STRING
    },
    {
      sequelize,
      modelName: "ChatbotIntegrationsSetting",
      timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
      underscored: true,
    }
  );
  return ChatbotIntegrationsSetting;
};