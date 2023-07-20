const { User, Organization,ProjectUsage, ProjectDomain,Invitation, OrganizationMember, App,Project, ProjectMember,ProjectIndex,ProjectSetting,ProjectKey,ProjectFile,UsageData,UsageLimit,ShareLinkIntegrationSetting,sequelize } = require("../../../../Models");
let sha256 = require("sha256");
let moment = require("moment");
let Joi = require("@hapi/joi");
let md5 = require("md5");
const { v4: uuidv4 } = require('uuid');
// let { syncContactToChatBotList } = require(baseDir() + "helper/syncContactToBrevo");
let { formatJoiError, ucfirst, isset, strlen, strpos, count, authUser, in_array, rand, validateParameters, getIpDetail,userPrivilege,checkOrganizationLimit,increaseLimit,notifyOnDiscord } = require(baseDir() + "helper/helper");
// let { sessionMiddleware } = require('../../Middlewares/Auth')
let Sequelize = require("sequelize");
const Op = Sequelize.Op;
const QueryTypes = Sequelize.QueryTypes;

module.exports = class QAExpertController {
    /**
     * Create a project
     * @param {*} req 
     * @param {*} res 
     * @returns 
     */

    async createWorkSpace(req, res) {
        // request body
        let input = req.body;
        let result = validateParameters(["name"], input);
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
        let organization_id
        let type = isset(input.type,"basic")
        let purpose = isset(input.purpose,null)
        let website_url = isset(input.website_url,null);
        let app_id = 2;

        const organizationData = await Organization.findOne({
            where : {
                created_by : user_id
            }
        })
        if (!organizationData) {
            return res.status(400).send({
                type: "RXERROR",
                message: "Organization not found",
            })
        }

        organization_id = organizationData.id
        let status;
        const myAppId = uuidv4();
        let project_uid = myAppId.substr(0, 8) + myAppId.substr(8, 4) + myAppId.substr(12, 4) + myAppId.substr(16, 4) + myAppId.substr(20);
        const str = project_uid + Math.floor(Math.random() * 10001) + Date.now() + name
        let hash = sha256(str)
        let data;

        let usage_type = "workspace"
        
        const limitCheck = await checkOrganizationLimit({organization_id : organization_id , app_id : app_id , project_id : null , usage_type : usage_type})
        if(limitCheck?.data < 1){
            return res.status(409).send({
                type: "RXERROR",
                message: "Your have already reached the limit. Kindly upgrade to continue."
            })
        }else if(limitCheck?.message){
            return res.status(400).send({
                type: "RXERROR",
                message: limitCheck.message
            })
        }

        try {
            // Create the projects
            data = await Project.create({
                name: name,
                project_uid:project_uid,
                app_id:app_id,
                organization_id: organization_id,
                created_by: user_id,
                type : type
            });

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

            await ShareLinkIntegrationSetting.create({
                hash: hash,
                project_id:data.id
            });

            let by
            await increaseLimit(by=1,{app_id : app_id , organization_id : organization_id , usage_type : usage_type})
            const str = `New Project Create \`\`\`user_id =${data.created_by} , project_id=${data.id}, name = ${data.name}, purpose = workspace\`\`\``
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
        
        const ChatBotData = {
            user_id : user_id,
            list_id : 10
        }
        const syncChatBotData = await syncContactToChatBotList(ChatBotData)
        return res.status(200).send({
            type: "RXSUCCESS",
            message: "Data Created Successfully!",
            data: data
        })
    }

    async getMyWorkSpaces(req, res) {
        // request body
        let input = req.body;
        
        let orderBy = isset(input.orderBy, "DESC");
        let app_id = 2
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

        let total_link = 'SELECT COUNT(*) FROM project_urls WHERE project_urls.project_id = Project.id';
        let total_file = 'SELECT COUNT(*) FROM project_files WHERE project_files.project_id = Project.id';

        total_file = '(' + total_file + ')',
        total_link = '(' + total_link + ')'

        // Get projects data
        const data = await Project.findAndCountAll({
            attributes : {
                include : [
                [Sequelize.literal(total_link),'total_link'],
                [Sequelize.literal(total_file),'total_file'],
                
            ]},
            distinct: true,
            order:[['id', orderBy]],
            limit: limit,
            offset: offset,
            where: {
                ...customWhere,
                app_id,
                created_by : user_id
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

    async getWorkSpaceDetail(req, res) {
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
                    model:Organization,
                    as:'organization',
                    attributes: [
                        "id",
                        "name",
                        [Sequelize.literal("CASE WHEN openai_key IS NULL THEN 'false' ELSE 'true' END"), "has_openai_key"],
                    ],

                },
                {
                    model:ProjectMember,
                    as:"ProjectMembers"
                },
                {
                    model:ProjectSetting,
                    as:"ProjectSetting"
                },
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

    async updateWorkSpace(req, res) {
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

        if (!data) {
            return res.status(400).send({
                type: "RXERROR",
                message: "WorkSpace not found",
            })
        }
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
            message: "Data Updated Successfully!",
            data : data
        })
    }

    async deleteWorkSpace(req,res){
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
            return res.status(400).send({ type:"RXERROR",message:"WorkSpace Not found"})
        }
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
            return res.status(200).send({ type:"RXSUCCESS",message:"WorkSpace deleted successfully"})
        }else{
            // return 400
            return res.status(400).send({ type:"RXERROR",message:"WorkSpace Not found"})
        }
    }

    async refreshShareLinkHash(req,res) {
        // request body
        let input = req.body;
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
        let project_uid = input.project_uid
        let user_id = req.authUser.user_id;
        let projectData = await Project.findOne({
            where : {
                project_uid : project_uid
            }
        })

        if (!projectData) {
            return res.status(400).send({
                type : "RXERROR",
                message : "WorkSpace not found"
            })
        }

        const project_id = projectData.id
        const str = project_uid + Math.floor(Math.random() * 10001) + Date.now() + projectData.name
        let hash = sha256(str)

        let data = await ShareLinkIntegrationSetting.update({hash : hash},{
            where : {
                project_id : project_id
            },
            returning: true
        })

        data = await ShareLinkIntegrationSetting.findOne({
            where : {
                project_id : project_id
            }
        })

        return res.status(200).send({
            type : "RXSUCCESS",
            message : "Data updated successfully",
            data : data
        }) 
    }

    async getWorkSpaceShareLink(req,res) {
        // request body
        let input = req.body;
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
        let project_uid = input.project_uid
        let projectData = await Project.findOne({
            where : {
                project_uid : project_uid
            }
        })

        if (!projectData) {
            return res.status(400).send({
                type : "RXERROR",
                message : "WorkSpace not found"
            })
        }
        const project_id = projectData.id

        const data = await ShareLinkIntegrationSetting.findOne({
            where : {
                project_id : project_id
            }
        })

        return res.status(200).send({
            type : "RXSUCCESS",
            message : "Data fetch successfully",
            data : data
        }) 
    }
}