'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class ProjectSetting extends Model {
        /**
         * Helper method for defining associations.
         * This method is not a part of Sequelize lifecycle.
         * The `models/index` file will call this method automatically.
         */
        static associate(models) {
            this.myAssociation=models.Project.hasOne(models.ProjectSetting,   { as: 'ProjectSetting', foreignKey: "project_id"});
        }
    };
    ProjectSetting.init({
        project_id: DataTypes.STRING,
        model: DataTypes.STRING,
        max_tokens: DataTypes.INTEGER,
        temperature: DataTypes.STRING,
        last_updated: DataTypes.TIME,
        stop:DataTypes.STRING,
        prompt_suffix:DataTypes.STRING
    }, {
        sequelize,
        modelName: 'ProjectSetting',
        createdAt: false,
        updatedAt: false,
        underscored: true,
    });
    return ProjectSetting;
};