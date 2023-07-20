const { User, Organization,ProjectUsage, ProjectDomain,Invitation, OrganizationMember, App,Project, ProjectMember,ProjectIndex,ProjectSetting,ProjectKey,ProjectUrl,ProjectFile,UsageData,UsageLimit,sequelize } = require("../../../../Models");
let sha256 = require("sha256");
let moment = require("moment");
let Joi = require("@hapi/joi");
let md5 = require("md5");
const { v4: uuidv4 } = require('uuid');
// let { syncContactToChatBotList,updateBrevoContact } = require(baseDir() + "helper/syncContactToBrevo");
let { formatJoiError, ucfirst, isset, strlen, strpos, count, authUser, in_array, rand, validateParameters, getIpDetail,userPrivilege,checkOrganizationLimit,increaseLimit,notifyOnDiscord } = require(baseDir() + "helper/helper");
// let { sessionMiddleware } = require('../../Middlewares/Auth')
let Sequelize = require("sequelize");
const Op = Sequelize.Op;
const QueryTypes = Sequelize.QueryTypes;

module.exports = class AppController {
    /**
     * Create a project
     * @param {*} req 
     * @param {*} res 
     * @returns 
     */

    async createProject(req, res) {
        // request body
        let input = req.body;
        let result = validateParameters(["name", "organization_id","type","app_id"], input);
        // check parameter validation
        if (result != 'valid') { 
            let error = formatJoiError(result.errors);
            return res.status(400).send({
                type: "RXERROR",
                message: "Invalid params",
                errors: error
            });
        }

        let user_id = req.authUser.user_id;
        let name = input.name;
        let organization_id = input.organization_id;
        let type = isset(input.type,"basic")
        let purpose = isset(input.purpose,null)
        let website_url = isset(input.website_url,null);
        let app_id = isset(input.app_id,null);
      

        if(app_id!==null){
            let validate_app_id = await App.findOne({
                where:{
                    id:app_id
                }
            })
            if(!validate_app_id){
                return res.status(400).send({type:"RXERROR",message:"Please provide a valid app_id"})
            }
        }

        let checkOrganizationPrivilege = await OrganizationMember.findOne({
            where: {
              user_id: user_id,
              organization_id: organization_id,
              role:'owner'
            }
          })

          if (!checkOrganizationPrivilege) {
            return res.status(400).send({
                type: "RXERROR",
                message: "organization owner is unauthorized"
            })
          }
        
          const plan = await UsageLimit.findOne({
            where : {organization_id : organization_id , app_id : app_id , project_id : null , limit_type : "chatbot"}
          })

        //   if (plan) {
        //     if (plan.plan_id == "1") {
        //         let  freeUsage = await UsageData.findOne({
        //             attributes : [[Sequelize.fn("SUM", Sequelize.col("usage_value")), "usageCount"]],
        //             where : {
        //                 plan_id :"1",
        //                 usage_type : "chatbot"
        //             }
        //         })
        //         freeUsage = JSON.parse(JSON.stringify(freeUsage));
                
        //         if (freeUsage?.usageCount >= 100) {
        //             return res.status(400).send({
        //                 type: "RXERROR",
        //                 message: "To prevent spam, we have set a free project limit. Limit reached. We'll notify you once slots are available, or upgrade to our paid plan. Contact support@yourgpt.ai for more info."
        //             })
        //         }
        //       }
        //   }

        let usage_type,valdateLimit=false;
        switch (app_id) {
            case "1":
                usage_type = "chatbot"
                valdateLimit=true;
                break;
            case "4":
                valdateLimit=false;
                break;
            case "2":
                valdateLimit=true;
                usage_type="workspace"
                break;
            default:
                break;
        }
        
        if(valdateLimit){
            
            const data = await checkOrganizationLimit({organization_id : organization_id , app_id : app_id , project_id : null , usage_type : usage_type})
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
    
     
        let status;
        const myAppId = uuidv4();
        let project_uid = myAppId.substr(0, 8) + myAppId.substr(8, 4) + myAppId.substr(12, 4) + myAppId.substr(16, 4) + myAppId.substr(20);
        // let api_key =  sha256("YOURGPT_SECRET" + project_uid + "-" + Math.floor(Date.now() / 1000) + Math.floor(Date.now() / 1000));
        let data;


        try {
            // Create the project
            data = await Project.create({
                name: name,
                user_id: user_id,
                project_uid:project_uid,
                type: type,
                purpose:purpose,
                // api_key:api_key,
                app_id:app_id,
                organization_id: organization_id,
                created_by: user_id
            });

            if(purpose=='chatbot'){
                let domain_data = await ProjectDomain.findOne({
                    where:{
                        domain:website_url,
                        project_id: data.id
                    }
                })
                if(!domain_data){
                    await ProjectDomain.create({
                        domain:website_url,
                        project_id:data.id
                    })
                }
            }
            // Create Project Session
            await ProjectSetting.create({
                project_id: data.id,
                model: "text-davinci-003",
                max_tokens: 1000,
                temprature: 1,
                stop:"END",
                prompt_suffix:"###"
            });
            // Add the creator to the project
            await ProjectMember.create({
                role: "owner",
                user_id: user_id,
                project_id:data.id
            });
            // create project_usage
            await ProjectUsage.create({
                project_id:data.id,
                plan:'basic',
                query_count:0,
                document_count:0
            })

            // if(type!="basic"){
            //     if(data){
            //         // create project_index 
            //         await ProjectIndex.create({
            //             project_id:data.id,
            //             name:"ProjectS3FileIndex",
            //             connector:"S3Reader",
            //             rebuild_duration: null,
            //             rebuild:"yes",
            //             status:"building",
            //             next_index:null
            //         });
            //     }
            // }
            if (valdateLimit) {
                let by
                await increaseLimit(by=1,{app_id : app_id , organization_id : organization_id , usage_type : usage_type})
            }
            const str = `New Project Created\`\`\`user_id =${data.created_by}, project_id=${data.id}, name = ${data.name}, purpose = ${purpose}\`\`\`
            `;
            await notifyOnDiscord(str)

        } catch (err) {
            let error = err;
            console.log(error)
            return res.status(400).send({
                type: "RXERROR",
                message: "Unable to create data!",
                errors: error
            })
        }
        // return 200
        const chatBot = await Project.findAll({
            where : {
                created_by : user_id
            }
        })
        const chatbot_count = chatBot.length
        const searchBy = req.authUser.User.email
        
        const ChatBotData = {
            user_id : user_id,
            list_id : 10
        }
        const syncChatBotData = await syncContactToChatBotList(ChatBotData)
        const updateChatBotCount = await updateBrevoContact({chatbot_count:`${chatbot_count}`},searchBy)
        return res.status(200).send({
            type: "RXSUCCESS",
            message: "Data Created Successfully!",
            data: data
        })
    }

    /**
     * Update project 
     * @param {*} req 
     * @param {*} res 
     * @returns 
     */

    async updateProject(req, res) {
        // request body
        let input = req.body;
        let name = isset(input.name, null);
        let user_id = req.authUser.user_id;
        // dd(user_id)
        let result = validateParameters(["project_uid"], input);
        // check parameter validation
        if (result != 'valid') {
            let error = formatJoiError(result.errors);
            return res.status(400).send({
                type: "RXERROR",
                message: "Invalid params",
                errors: error
            });
        }
        // get project_data using project_uid
        let data = await Project.findOne({
            where:{
                project_uid:input.project_uid
            }
        });
        let project_id = data.id;
        // check user privilege
        const permission =await userPrivilege({type :'project',searchParam :{user_id:user_id,project_id:project_id},allowedRole:["owner","contributor"],key:input.project_uid})
        console.log("permission",permission);
        if (permission !== 'valid') {
            return res.status(400).send({
                type: "RXERROR",
                message: permission.message,
            })
        }

        let updateStatement = {};

        if (name != null) {
            updateStatement.name = name;
        }

        // update
        try {
            await Project.update(updateStatement, {
                where: {
                    project_uid: input.project_uid
                }
            })
        } catch (err) {
            let error = err;
            return res.status(400).send({
                type: "RXERROR",
                message: "Oops! some error occured!",
                error: error
            })
        }

        return res.status(200).send({
            type: "RXSUCCESS",
            message: "Data Updated Successfully!"
        })
    }
    
    /**
     * Get all project of user
     * @param {*} req 
     * @param {*} res 
     * @returns 
     */
    async getMyProjects(req, res) {
        // request body
        let input = req.body;
        
        let orderBy = isset(input.orderBy, "DESC");
        let app_id = isset(input.app_id, null);
        let limit = parseInt(isset(input.limit, 10));
        let offset = 0 + (isset(input.page, 1) - 1) * limit;
        if (offset < 1) {
            offset = 0;
        }
    
        let user_id = req.authUser.user_id;
        let search = isset(input.search, null);
        let customWhere={};

        if(search != null) {
            customWhere={
                name:{
                    [Op.like]: (typeof search!="undefined"?search+"%":"%")
                }
            }
        }else{
            customWhere = {}
        }

        let custom_app_id={};

        if(app_id != null) {
            custom_app_id={
                app_id:{
                    [Op.like]: (typeof app_id!="undefined"?app_id+"%":"%")
                }
            }
        }else{
            custom_app_id = {}
        }

        
        // Get projects data
        const data = await Project.findAndCountAll({
            distinct: true,
            where: {
                [Op.or]: [
                  // find projects where the user is a member of the organization
                  {
                    '$organization->OrganizationMembers.user_id$': user_id
                  },
                  // find projects where the user is a member of the project
                  {
                    '$ProjectMembers.user_id$': user_id
                  },
              
                ],
                ...customWhere,
                ...custom_app_id
            },
            include: [
              {
                
                as:'organization',
                model: Organization,
                attributes:["id","created_by","name",
                [Sequelize.literal("CASE WHEN openai_key IS NULL THEN 'false' ELSE 'true' END"), "has_openai_key"]
              ],
                include: [
                  {
                    as:'OrganizationMembers',
                    model: OrganizationMember,
                    attributes: []
                  }
                ]
              },
              {
                as:'ProjectMembers',
                model: ProjectMember,
                attributes: [],
            
              }
            ]
          });
        // return 200
        return res.status(200).send({
            type:"RXSUCCESS",
            message:"Data Fetched Successfully!",
            total:data.count,
            data:data['rows']
        })
    }

    async refreshProjectKey(req,res){
        let input = req.body;
        let api_key = req.project.api_key;
        let project_uid =  sha256("YOURGPT_SECRET" + api_key + "-" + Math.floor(Date.now() / 1000));
        let data =  await Project.update(
            {
              project_uid: project_uid,
            },
            {
              where: {
                api_key: api_key,
              },
            }
          );
        if(data){
            return res.status(200).send({ "type": "RXSUCCESS", "message": "Project key refreshed successfully"});
        }else{
            return res.status(400).send({ "type": "RXERROR", "message": "Something went wrong"});
        }
    }
    
    /**
     * Update project setting
     * @param {*} req 
     * @param {*} res 
     * @returns 
     */
    async updateProjectSettings(req,res){
        // request body
        let input = req.body;
        let user_id = req.authUser.user_id;
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
        // Get project data with project_setting on the base of project_uid
        let data = await Project.findOne({
            include:[{
                model:ProjectSetting,
                as:'projectSetting'
            }],
            where:{
                project_uid:project_uid
            }
        });
        
        if(data){
            let check_organization = await OrganizationMember.findOne({
                where:{
                    organization_id:data.organization_id,
                    role : "owner",
                    user_id : user_id
                }
            })
    
            if(!check_organization){
                return res.status(400).send({type:"RXERROR",message:"you are not a owner of organization"})
            }
            if(typeof input.project_id!="undefined"){
                delete input.project_id;
            }
          
            let project_setting_id = data.projectSetting[0]['id'];
            await  ProjectSetting.update(input,{ 
                where : { id : project_setting_id }
            });
            // return 200
            return res.status(200).send({ "type": "RXSUCCESS", "message": "Project setting updated successfully"});
        }else{
            // return 400
            return res.status(400).send({ "type": "RXERROR", "message": "Project not found"});
        }
    }

    async generateProjectKey(req, res) {
        let input = req.body;
      
        let result = validateParameters(["name","project_uid"], input);

        if (result != 'valid') {
            let error = formatJoiError(result.errors);
            return res.status(400).send({
                type: "RXERROR",
                message: "Invalid params",
                errors: error
            });
        }

        const projectdata = await Project.findOne({
            where : {project_uid : input.project_uid}
        })

        if (!projectdata) {
            return res.status(400).send({
                type: "RXERROR",
                message: "project does't not exist",
            });
        }
        const project_id = projectdata.id

        const publicKeyStr = "YOURGPT_PUBLIC_KEY"+ Date.now() + input.project_uid + Math.floor(Math.random() * 100000)
        const publicKeyHash = sha256(publicKeyStr)
        const public_key = "pks-" + publicKeyHash

        const secretKeyStr = "YOURGPT_SECRET_KEY" + Date.now() + input.project_uid + Math.floor(Math.random() * 100000)
        const secretKeyHash = sha256(secretKeyStr)
        const secret_key = "sck-" + secretKeyHash

        const data = await ProjectKey.create({name:input.name,project_id:project_id,public_key:public_key,secret_key:secret_key})

        if(data){
            return res.status(200).send({
                type:"RXSUCCESS",
                message:"projectKey generated successfully",
                data:data
            })
        }
    }

    async getProjectKey(req, res) {
        let input = req.body;
        // const user_id = req.authUser.user_id
        let result = validateParameters(["project_uid"], input);

        if (result != 'valid') {
            let error = formatJoiError(result.errors);
            return res.status(400).send({
                type: "RXERROR",
                message: "Invalid params",
                errors: error
            });
        }

        const data = await ProjectKey.findAll({
            attributes:['id','project_id',
                [Sequelize.fn('CONCAT', Sequelize.fn('SUBSTR', Sequelize.col('public_key'), 1, 3), '......', Sequelize.fn('SUBSTR', Sequelize.col('public_key'), -3)), 'public_key'],
                [Sequelize.fn('CONCAT', Sequelize.fn('SUBSTR', Sequelize.col('secret_key'), 1, 3), '......', Sequelize.fn('SUBSTR', Sequelize.col('secret_key'), -3)), 'secret_key'],
                "name","active","createdAt","deletedAt"
            ],
            include : [
                {
                    model : Project,
                    attributes : [],
                    as:"project",
                    where :{project_uid : input.project_uid},
                }
            ],
            paranoid: true
        })

        if(data.length > 0){
            return res.status(200).send({
                type:"RXSUCCESS",
                message:"The ProjectKey was successfully fetched",
                data:data
            })
        }

        return  res.status(400).send({
            type:"RXERROR",
            message:"project does't not exist",
        })
    }

    async deactivateProjectKey(req, res) {
        let input = req.body;
        const user_id = req.authUser.user_id
        let result = validateParameters(["project_uid","id"], input);

        if (result != 'valid') {
            let error = formatJoiError(result.errors);
            return res.status(400).send({
                type: "RXERROR",
                message: "Invalid params",
                errors: error
            });
        }
        const project = await Project.findOne({
            where : {project_uid : input.project_uid}
        })
        if (!project) {
            return res.status(400).send({
                type: "RXERROR",
                message: "project does't not exist",
            });
        }

        const project_id = project.id
        const data = await ProjectKey.update({active : "0"},{
            where : {project_id : project_id,id:input.id},
        })

        if(data == 1){
            return res.status(200).send({
                type:"RXSUCCESS",
                message:"The ProjectKey has been successfully deactivated",
            })
        }

        return  res.status(400).send({
            type:"RXERROR",
            message:"something went wrong",
        })
    }

    async deleteProjectKey(req, res) {
        let input = req.body;
        const user_id = req.authUser.user_id
        let result = validateParameters(["project_uid","id"], input);

        if (result != 'valid') {
            let error = formatJoiError(result.errors);
            return res.status(400).send({
                type: "RXERROR",
                message: "Invalid params",
                errors: error
            });
        }

        const data = await Project.findOne({
            where : {project_uid : input.project_uid}
        })

        if (!data) {
            return res.status(400).send({
                type: "RXERROR",
                message: "project does't not exist",
            });
        }

        const project_id = data.id
        // console.log(data[0]);
        const ProjectDelete = await ProjectKey.destroy({
            where : {project_id : project_id,id : input.id},
            paranoid : true
        })
      
        if (ProjectDelete == 1) {
            return res.status(200).send({
                type: "RXSUCCESS",
                message: "ProjectKey deleted successfully",
            });
        }

        return res.status(400).send({
            type: "RXERROR",
            message: "something went to be wrong",
        });
    }

    /**
     * Get projects detail with ProjectKey,Organization,ProjectUsage,ProjectMember,ProjectSetting,ProjectIndex,ProjectFile on the base of project_uid
     * @param {*} req 
     * @param {*} res 
     * @returns 
     */
    async getProjectDetail(req, res) {
        // request body
        let input = req.body;
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

        // get project detail with ProjectKey,ProjectUsage,ProjectMember,ProjectSetting,ProjectIndex,ProjectFile on the base of project_uid
        let data = await Project.findOne({

            include:[
                {
                    attributes:['id','project_id',
                        [Sequelize.fn('CONCAT', Sequelize.fn('SUBSTR', Sequelize.col('public_key'), 1, 3), '......', Sequelize.fn('SUBSTR', Sequelize.col('public_key'), -3)), 'public_key'],
                        [Sequelize.fn('CONCAT', Sequelize.fn('SUBSTR', Sequelize.col('secret_key'), 1, 3), '......', Sequelize.fn('SUBSTR', Sequelize.col('secret_key'), -3)), 'secret_key'],
                        "name","active","createdAt","deletedAt"
                    ],
                    model: ProjectKey,
                    as:"ProjectKeys",
                    required:false
                },
                {
                    model:Organization,
                    as:'organization',
                    attributes: [
                        "id",
                        "name",
                        [Sequelize.literal("CASE WHEN openai_key IS NULL THEN 'false' ELSE 'true' END"), "has_openai_key"],
                    ],

                },
                {
                    model:ProjectUsage,
                    as:'ProjectUsage'

                },
                {
                    model:ProjectMember,
                    as:"ProjectMembers"
                },
                {
                    model:ProjectSetting,
                    as:"ProjectSetting"
                },
                {
                    model:ProjectIndex,
                    as:"ProjectIndexes"
                },
                {
                    model:ProjectFile,
                    as:"ProjectFiles"
                }
            ],
            where:{
                project_uid: input.project_uid
            },
            paranoid: true
        })

        if(data == null) {
            // return 400 
            return res.status(400).send({
                type:"RXERROR",
                message: "No Records Found!"
            })
        }
        // return 200 success response 
        return res.status(200).send({
            type:"RXSUCCESS",
            message:"Data Fetched Successfully!",
            data: data
        })

    }

    async activateProjectKey(req,res){
        let input = req.body;
        let result = validateParameters(["project_uid","id"], input);

        if (result != 'valid') {
            let error = formatJoiError(result.errors);
            return res.status(400).send({
                type: "RXERROR",
                message: "Invalid params",
                errors: error
            });
        }
        const project = await Project.findOne({
            where : {project_uid : input.project_uid}
        })
        if (!project) {
            return res.status(400).send({
                type: "RXERROR",
                message: "project does't not exist",
            });
        }

        const project_id = project.id
        const data = await ProjectKey.update({active : "1"},{
            where : {project_id : project_id,id:input.id},
        })
       
        if(data == 1){
            return res.status(200).send({
                type:"RXSUCCESS",
                message:"The ProjectKey has been successfully activated",
            })
        }

        return  res.status(400).send({
            type:"RXERROR",
            message:"something went wrong",
        })
    }

    /**
     * Delete project on the base of project_uid
     * @param {*} req 
     * @param {*} res 
     * @returns 
     */
    async deleteProject(req,res){
        // request body
        let input = req.body;
        let project_uid = input.project_uid;
        let user_id = req.authUser.user_id;
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

        const projectData = await Project.findOne({
            where : {
                project_uid : project_uid
            }
        })
        if (!projectData) {
            return res.status(400).send({ type:"RXERROR",message:"Project Not found"})
        }
        const organization_id = projectData.organization_id
        const app_id = projectData.app_id
        // delete project on the base of project_uid and user_id(only user can delete his project)
        let data = await Project.destroy({
            where:{
                project_uid:project_uid,
                created_by:user_id
            },
            // paranoid : true
        })
        if(data){
            // return 200
            await UsageData.decrement('usage_value', { by: 1, where: { organization_id: organization_id,app_id : app_id,usage_type : "chatbot" }});
            return res.status(200).send({ type:"RXSUCCESS",message:"Project deleted successfully"})
        }else{
            // return 400
            return res.status(400).send({ type:"RXERROR",message:"Project Not found"})
        }
    }
}

