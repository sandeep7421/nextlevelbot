const { Session,Project,SessionMessage,ProjectUrl,sequelize,ProjectSiteMap,UsageData} = require("../../../../Models");
let { formatJoiError, isset, validateParameters,getProject,addToIndexQueue,increaseLimit,checkOrganizationLimit } = require(baseDir() + "helper/helper");
let Sequelize = require("sequelize");
const Op = Sequelize.Op;
let sha256 = require("sha256");
let moment = require("moment");
let Joi = require("@hapi/joi");
let md5 = require("md5");
const { v4: uuidv4 } = require('uuid');

module.exports = class ProjectUrlController {
    /**
     * Create project_url
     * @param {*} req 
     * @param {*} res 
     * @returns 
     */
    async createProjectUrl(req,res){
        // request body
        let input = req.body;
        const user_id = req.authUser.User.id
        // validate input parameters
        let result = validateParameters(["url","app_id"], input);
        if (result != 'valid') {
            let error = formatJoiError(result.errors);
            return res.status(400).send({
                type: "RXERROR",
                message: "Invalid params",
                errors: error
            });
        }

        let project_id ;
        let site_map_id =  isset(input.site_map_id, null);    
        let project_uid = isset(input.project_uid, null);
        let url_data  = input.url.toLowerCase(); //change url into lowercase if it is in uppercase
        let app_id = input.app_id;
        let urls = url_data.split(',');
        let organization_id=null;

        if(site_map_id){
            // find project_sitemaps data on the base of id to get project_id
            let sitemap_data = await ProjectSiteMap.findOne({
                include : [
                    {
                        model : Project
                    }
                ],
                where:{
                    id:site_map_id
                }

            })
            // if project_sitemaps data not found then return error
            if(!sitemap_data){
                return res.status(400).send({ type:"RXERROR",message:"Please provide a valid sitemap id" })
            }
            project_id = sitemap_data.project_id
            organization_id = sitemap_data.Project.organization_id

        }else{
            // if sitemap_id has not given then call getProject function to get roject_id
            let project_data = await Project.findOne({
                where: {
                  project_uid: project_uid
                }
            })
            if (!project_data) {
                return res.status(400).send({ type: "RXERROR", message: "Please provide a valid Project Uid" })
            }
            project_id = project_data.id;
            organization_id = project_data.organization_id
        }

        let usage_type,valdateLimit=false;
        switch (app_id) {
            case "1":
                usage_type = "document"
                valdateLimit=true;
                break;
            default:
                break;
        }
        let data
        if(valdateLimit){
            
             data = await checkOrganizationLimit({organization_id : organization_id , app_id : app_id , project_id : null , usage_type : usage_type})
            if(data?.data < 1){
                return res.status(409).send({
                    type: "RXERROR",
                    message: "Your have already reached the limit. Kindly upgrade to continue."
                })
            }else if(data?.message){
                return res.status(400).send({
                    type: "RXERROR",
                    message: data.message
                })
            }
        }
        const extracted_urls = urls.map(url => ({ url, project_id: project_id,site_map_id:site_map_id , user_id : user_id }));
      
        const url_length = extracted_urls.length;
        const limitLeft = data?.data[0]?.limit_left

        if (valdateLimit == true && limitLeft < url_length) {
          return res.status(409).send({
              type: "RXERROR",
              message: `You don't have sufficient remaining limit to create.`
          })
        }
    
        // if more than one url has given in input then map it to get urls in array , object
        // find project_url data on the base of project_id
        const checlUrl = await ProjectUrl.findAll({
            where: {
                url: {
                [Op.in]: [urls],
                },
                project_id:project_id
            }
          });
        // if url is already exist in project_url table then through error
        if(checlUrl.length > 0){
            // return 400
            return res.status(400).send({ type:"RXERROR",message:"Url already exist" })
        }
        
        try{
            // craete project_url using bulkCreate function to create  multiple urls if found multiple urls 
            let data = await ProjectUrl.bulkCreate(extracted_urls);
            
            if (valdateLimit) {
                let by
                await increaseLimit(by=url_length,{app_id : app_id , organization_id : organization_id , usage_type : usage_type})
            }
            await addToIndexQueue("addProjectURL",data)
            // return 200
            return res.status(200).send({ type:"RXSUCCESS",message:"ProjectUrl created successfully",data:data })
        }catch(err){
            console.log(err)
            // return 400
            return res.status(400).send({ type:"RXERROR",message:"Something went wrong",error:err })
        }
    }

    /**
     * Get project_url on the base of project_uid
     * @param {*} req 
     * @param {*} res 
     * @returns 
     */
    async getProjectUrl(req,res){
        // request body
        let input = req.body;
        let project_uid = input.project_uid;
        // validate input parameters
        let result = validateParameters(["project_uid"], input);
        if (result != 'valid') {
            let error = formatJoiError(result.errors);
            return res.status(400).send({
                type: "RXERROR",
                message: "Invalid params",
                errors: error
            });
        }
        // call getProject function to get project_id
        let project_data = await getProject(res,project_uid);
        let project_id = project_data.id;
        // get project_url data on the base of project_id
        let data = await ProjectUrl.findAll({
            where:{
                project_id:project_id
            }
        })
        if(data){
            // return 200
            return res.status(200).send({ type:"RXSUCCESS",message:"Get ProjectUrl data",data:data })
        }else{
            // return 400
            return res.status(400).send({ type:"RXERROR",message:"Something went wrong" })
        }
    }
 
    /**
     * Delete project_url on the base of project_uid
     * @param {*} req 
     * @param {*} res 
     * @returns 
     */
    async deleteProjectUrl(req,res){
        // request body
        let input = req.body;
        let id = input.id;
        let project_uid = input.project_uid
        // validate input parameters
        let result = validateParameters(["id","project_uid"], input);
        if (result != 'valid') {
            let error = formatJoiError(result.errors);
            return res.status(400).send({
                type: "RXERROR",
                message: "Invalid params",
                errors: error
            });
        }
        // call getProject function to get project_id
        let project_data = await getProject(res,project_uid);
        let project_id = project_data.id; 
        let organization_id = project_data.organization_id;
        let app_id = 1;
        // delete project_url on the base of project_url id and project_id
        let data = await ProjectUrl.update({status:"deleting"},{
            where:{
                id:id,
                project_id:project_id
            }
        })
        await addToIndexQueue("deleteProjectURL",{"id":id,"project_id":project_id})
        if(data){
            await UsageData.decrement('usage_value', { by: 1, where: { organization_id: organization_id,app_id : app_id,usage_type : "document" }}); 
            // return 200
            return res.status(200).send({ type:"RXSUCCESS",message:"Project url deleted successfully" })
        }else{
            // return 400
            return res.status(400).send({ type:"RXERROR",message:"Not found" })
        }   
    }
}