const { User, sequelize, Project,Integration,ProjectIntegration } = require("../../../../Models");
let { formatJoiError, isset, strlen, strpos, count, authUser, validateParameters } = require(baseDir() + "helper/helper");
let Sequelize = require("sequelize");
const Op = Sequelize.Op;


module.exports = class IntegrationController {
 
    /**
     * Get all integration
     * @param {*} req 
     * @param {*} res 
     * @returns 
     */
    async getIntegration(req,res){
        let data = await Integration.findAll();
        return res.status(200).send({"type":"RXSUCCESS","message":"Get integration data",data:data});
    }

    /**
     * Get integration on the base of project_uid
     * @param {*} req 
     * @param {*} res 
     * @returns 
     */
    async getMyIntegration(req,res){
        let user_id = req.authUser.user_id;
        let project_uid = req.body.project_uid;
        
        // get projects data on the base of projectuid
        let project_data = await Project.findOne({
            where:{
                project_uid:project_uid
            }
        })
        // if projects data not found through error
        if(project_data==null){
            return res.status(400).send({type:"RXERROR",message:"Please provide a valid project_uid"})
        }

        // let data = await ProjectIntegration.findAll({
            
        //     attributes:["id","project_id","integration_id"],
        //     include:[{
        //         model:Project,
        //         as:'project',
        //         include:[{
        //             model:DiscordIntegrationsSetting,
        //             as:'discordIntegrationsSetting',
        //         },
        //         {
        //             model:SlackIntegrationsSetting,
        //             as:'slackIntegrationsSetting',

        //         }],
        //         where:{
        //             created_by:user_id,
        //         }
        //     }],
        // })
        
        // find integratins with project data on the base of project_id
        let data = await Integration.findAll({
            attributes:["id","name","images"],
                include: [{
                  model: Project,
                  as:'IntegrationProject',
                  attributes:[],
                  where: { id: project_data.id}
                }]
        });


        if(data){
            // return 200
            return res.status(200).send({type:"RXSUCCESS",message:"Get project integration",data:data})
        }else{
            // return 400
            return res.status(400).send({type:"RXERROR",message:"Something went wrong"})
        }
    }

    /**
     * it will find those integrations where project is not integrated
     * @param {*} req 
     * @param {*} res 
     * @returns 
     */
    async getOtherIntegration(req,res){
        let user_id = req.authUser.user_id;
        let project_uid = req.body.project_uid;
        
        // find projects data on the base of project_uid to get project_id
        let project_data = await Project.findOne({
            where:{
                project_uid:project_uid
            }
        })
        // if projects data not found through error
        if(project_data==null){
            return res.status(400).send({type:"RXERROR",message:"Please provide a valid project_uid"})
        }

        // Find integrations where project is not integrated
        let data = await Integration.findAll({
            where: {
                id: {
                  [Op.notIn]: Sequelize.literal(`(SELECT integration_id FROM project_integrations where project_id=${project_data.id})`)
                }
            }
        });

        if(data){
            // return 200
            return res.status(200).send({type:"RXSUCCESS",message:"Get other project integration",data:data})
        }else{
            // return 400
            return res.status(400).send({type:"RXERROR",message:"Something went wrong"})
        }

    }
     
    /**
     * Get all integration of epecific project
     * @param {*} req 
     * @param {*} res 
     * @returns 
     */
    async getProjectIntegrationIds(req,res){
        // request body
        let input = req.body;
        let project_uid = input.project_uid;
        // check parameter validation
        let result = validateParameters(["project_uid"], input);
        if (result != 'valid') {
            let error = formatJoiError(result.errors);
            return res.status(400).send({
                type: "RXERROR",
                message: "Invalid params",
                errors: error
            });
        }
        // get project data using project_uid
        let project_data = await Project.findOne({
            where:{
                project_uid:project_uid
            }
        });
        // Through error if project not found
        if(!project_data){
            return res.status(400).send({type:"RXERROR",message:"Invalid project_uid"})
        }
        let project_id = project_data.id;
        // get integratin_ids using project_id
        let integration_data = await ProjectIntegration.findAll({
            attributes:["integration_id"],
            where:{
                project_id:project_id
            }
        })
        let integration_ids = integration_data.map(integration => integration.integration_id)
        if(integration_ids){
            // return 200
            return res.status(200).send({type:"RXSUCCESS",message:"Get project integration ids",data:integration_ids})
        }else{
            // return 400
            return res.status(400).send({type:"RXERROR",message:"Something went wrong"})
        }
    }

}