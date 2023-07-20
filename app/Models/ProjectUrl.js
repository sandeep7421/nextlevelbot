'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class ProjectUrl extends Model {
        /**
         * Helper method for defining associations.
         * This method is not a part of Sequelize lifecycle.
         * The `models/index` file will call this method automatically.
         */
        static associate(models) {
        }
    };
    ProjectUrl.init({
        site_map_id : DataTypes.INTEGER,
        project_id  : DataTypes.INTEGER,
        url         : DataTypes.STRING,
        user_id  : DataTypes.INTEGER,
        // deleted_at  : DataTypes.TIME,
        status: DataTypes.ENUM('running', 'error', 'success'),
        status_info: DataTypes.STRING
    }, {
        sequelize,
        modelName: 'ProjectUrl',
        tableName: 'project_urls',
        timestamps: { createdAt: 'created_at', updatedAt: 'updated_at'},
        underscored: true,
        // paranoid: true
    });
    return ProjectUrl;
};