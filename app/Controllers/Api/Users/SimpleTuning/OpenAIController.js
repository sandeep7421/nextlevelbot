const { User, Organization, Invitation, OrganizationMember, Project, ProjectIndex, ProjectFile} = require("../../../../Models");
let { formatJoiError, ucfirst, isset, strlen, strpos, count, authUser, in_array, rand, validateParameters, getIpDetail,decrypt } = require(baseDir() + "helper/helper");
const { Configuration, OpenAIApi } = require("openai");
const fs = require("fs");
let AWS = require('aws-sdk');
let FormData= new require("form-data");
let fetch= new require("node-fetch");



module.exports = class FileController {


    async getProjectFileSignedUrl(req, res) {

        // Input & validate
        let input = req.body;

        console.log("getS3SignedUrlForProjectFile input log", input);


        let result = validateParameters(["file_name","project_uid"], input);

        if (result != 'valid') {
            let error = formatJoiError(result.errors);
            return res.status(400).send({
            type: "RXERROR",
            message: "Invalid params",
            errors: error
            });
        }
        let fileName = input.file_name;
        let project_uid = input.project_uid;
        fileName = fileName.replace(/ /g, "-");

        AWS.config.update({
            accessKeyId: config("aws").accessKeyId, // Access key ID
            secretAccessKey: config("aws").secretAccessKey, // Secret access key
            region: config("aws").region //Region
        });

        // Singed URL
        let filename = Math.floor(Date.now() / 1000) + "-" + Math.floor(Math.random() * 10000) + "-" + fileName
        let modifiedFileName = "projects/"+project_uid+"/data/" + filename;
        let s3 = new AWS.S3({
            signatureVersion: 'v4'
        });

        // Singed
        let signedUrl = s3.getSignedUrl('putObject', {
            Bucket: config("aws").bucketName,
            Key: modifiedFileName,
            Expires: 3600,
            ACL: 'public-read'
        });

        console.log('presigned url: ', signedUrl);

        // Return success
        return res.status(200).send({ "type": "RXSUCCESS", "data": { "url": signedUrl, "filename": filename } });
    }
    
    async uploadFile(req, res) {
        let input = req.body;    
        let result = validateParameters(["file_name","original_filename","project_uid"], input);
        if (result != 'valid') {
            let error = formatJoiError(result.errors);
            return res.status(400).send({
            type: "RXERROR",
            message: "Invalid params",
            errors: error
            });
        }
        let original_filename = input.original_filename;
        let filename = input.file_name;
        let project_uid = input.project_uid;
    
        let { accessKeyId, secretAccessKey, region, bucketName } = config('aws');
        AWS.config.update({
            accessKeyId: accessKeyId, // Access key ID
            secretAccessKey: secretAccessKey, // Secret access key
            region: region //Region
        });
    
        let s3 = new AWS.S3();
        var getParams = {
            Bucket: bucketName,
            Key: "projects/" + project_uid + "/data/" + filename
        }
        
        let checkFile=await new Promise((resolve,error)=>{
            s3.headObject(getParams, function(err, data) {
            // Handle any error and exit
            if (err)
                resolve(err);
            resolve(data);
            });
        });
        console.log(checkFile)
        // check file
        if(typeof checkFile.ContentType=="undefined"){
            return res.status(400).send({"error":{"text":"File not found"},"file":getParams});
        }

        let findProject = await Project.findOne({
            include: [{ 
                model: Organization, 
                as: 'organization',
                required: false,
            }],
            where:{
                project_uid:project_uid
              },
        });
        if(!findProject){
            return res.status(400).send({"type":"RXERROR","message":"Something went wrong"});
        }

        let fileURL = s3.getSignedUrl('getObject', getParams);



        let api_key = findProject.organization.openai_key;
        if(api_key==null || api_key==''){
            return res.status(400).send({"type":"RXERROR","message":"api_key has invalid or undefined value"})
        }
        api_key  = await decrypt(api_key);
        try{
            let file=await fetch(fileURL).then(res => res.buffer())
            var formdata = new FormData();
            formdata.append("purpose", "fine-tune");
            formdata.append("file", file, original_filename);
            var requestOptions = {
                method: 'POST',
                headers: {
                    "Authorization": "Bearer "+api_key
                },
                body: formdata,
                redirect: 'follow'
            };
            
            let fileResponse=await fetch("https://api.openai.com/v1/files", requestOptions).then(response => response.json());

            if(typeof fileResponse.error!="undefined"){
                return res.status(400).send({"type":"RXERROR","message":fileResponse.error.message})
            }

            console.log(fileResponse);
            
            let user_id = req.authUser.user_id;
            // store in database
            let data = await ProjectFile.create({
                project_id : input.project_id,
                user_id : user_id,
                name    : original_filename,
                path    : "projects/" + project_uid + "/data/" + filename
            });

            // Return success
            return res.status(200).send({
                "type": "RXSUCCESS",
                "message": "File uploaded successfully",
                "data":fileResponse
            });
        }catch(error){
                // handle error
            if (error.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx
                console.log(error.response.data);
                console.log(error.response.status);
                console.log(error.response.headers);
                let errors=error.response.data;

                return res.status(400).send({"type":"RXERROR","message":errors.error.message})
            } else if (error.request) {
                // The request was made but no response was received
                console.log(error.request);
                return res.status(400).send({"type":"RXERROR","message":"Something went wrong"})
            } else {
                // Something happened in setting up the request that triggered an Error
                console.log('Error', error.message);
                return res.status(400).send({"type":"RXERROR","message":error.message})
            }
           
        }
     
     

    }

    async getAllFiles(req, res) {
        let input = req.body;
        let project_uid = input.project_uid;
        let result = validateParameters(["project_uid"], input);
        if (result != 'valid') {
            let error = formatJoiError(result.errors);
            return res.status(400).send({
                type: "RXERROR",
                message: "Invalid params",
                errors: error
            });
        }
        let data = await Project.findOne({
            include: [{ 
                model: Organization, 
                as: 'organization',
                required: false,
            }],
            where:{
                project_uid:project_uid
              },
        });
        if(data){
            let api_key = data.organization.openai_key;
            if(api_key==null || api_key==''){
                return res.status(400).send({"type":"RXERROR","message":"Please set your OpenAPI in your Organization","errorCode":1024})
            }
            api_key  = await decrypt(api_key);
            const configuration = new Configuration({
                apiKey: api_key
            });
            const openai = new OpenAIApi(configuration);
            const response = await openai.listFiles();
            return res.status(200).send({"type":"RXSUCCESS","message":"Get all files","data":response['data']['data']})
        }else{
            return res.status(400).send({"type":"RXERROR","message":"Invalid Project id"})
        }

   }
   

   /**
    * Get file detail by id 
    * @param {*} req 
    * @param {*} res 
    * @returns 
    */
   async getFileDetail(req,res){
        // request body
        let input = req.body;
        let file_id = input.file_id;
        let project_uid = input.project_uid;
        // check parameter validation
        let result = validateParameters(["project_uid","file_id"], input);
        if (result != 'valid') {
            let error = formatJoiError(result.errors);
            return res.status(400).send({
                type: "RXERROR",
                message: "Invalid params",
                errors: error
            });
        }
        // get project data with organization
        let data = await Project.findOne({
            include: [{ 
                model: Organization, 
                as: 'organization',
                required: false,
            }],
            where:{
                project_uid:project_uid
              },
        });
        if(data){
            let api_key = data.organization.openai_key;
            if(api_key==null || api_key==''){
                return res.status(400).send({"type":"RXERROR","message":"api_key has invalid or undefined value"})
            }
            api_key  = await decrypt(api_key);
            const configuration = new Configuration({
                apiKey: api_key
            });
            const openai = new OpenAIApi(configuration);
            const response = await openai.retrieveFile(file_id);
            return res.status(200).send({"type":"RXSUCCESS","message":"Get file detail by id","data":response['data']})
        }else{
            return res.status(400).send({"type":"RXERROR","message":"Something went wrong"})   
        }
    }

     /**
    * Get file detail by id 
    * @param {*} req 
    * @param {*} res 
    * @returns 
    */
   async getFileContent(req,res){
        // request body
        let input = req.body;
        let file_id = input.file_id;
        let project_uid = input.project_uid;
        // check parameter validation
        let result = validateParameters(["project_uid","file_id"], input);
        if (result != 'valid') {
            let error = formatJoiError(result.errors);
            return res.status(400).send({
                type: "RXERROR",
                message: "Invalid params",
                errors: error
            });
        }
        // get project data with organization
        let data = await Project.findOne({
            include: [{ 
                model: Organization, 
                as: 'organization',
                required: false,
            }],
            where:{
                project_uid:project_uid
            },
        });
        if(data){
            let api_key = data.organization.openai_key;
            if(api_key==null || api_key==''){
                return res.status(400).send({"type":"RXERROR","message":"api_key has invalid or undefined value"})
            }
            api_key  = await decrypt(api_key);
            const configuration = new Configuration({
                apiKey: api_key
            });
            const openai = new OpenAIApi(configuration);
            const response = await openai.downloadFile(file_id);
       
            return res.status(200).send({"type":"RXSUCCESS","message":"Get file detail by id","data":response['data']})
        }else{
            return res.status(400).send({"type":"RXERROR","message":"Something went wrong"})   
        }
        }

    
    /**
     * Get all models detail
     * @param {*} req 
     * @param {*} res 
     * @returns 
     */
    async getAllModels(req,res){
        // request body
        let input = req.body;
        let file_id = input.file_id;
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
        // get project data with organization
        let data = await Project.findOne({
            include: [{ 
                model: Organization, 
                as: 'organization',
                required: false
            }],
            where:{
                project_uid:project_uid
              },
        });
        if(data){
            let api_key = data.organization.openai_key;
            if(api_key==null || api_key==''){
                return res.status(400).send({"type":"RXERROR","message":"api_key has invalid or undefined value"})
            }
            api_key  = await decrypt(api_key);
            const configuration = new Configuration({
                apiKey: api_key
            });
            const openai = new OpenAIApi(configuration);
            const response = await openai.listModels();
            return res.status(200).send({"type":"RXSUCCESS","message":"Get all Models","data":response['data']['data']})
        }else{
            return res.status(400).send({"type":"RXERROR","message":"Something went wrong"})
        }
    }

      
    /**
     * Create fine tune
     * @param {*} req 
     * @param {*} res 
     * @returns 
     */
    async createFineTune(req,res){
        // request body
        let input = req.body;
        let project_uid = input.project_uid;
        // check parameter validation
        let result = validateParameters(["project_uid","name","training_file","model"], input);
        if (result != 'valid') {
            let error = formatJoiError(result.errors);
            return res.status(400).send({
                type: "RXERROR",
                message: "Invalid params",
                errors: error
            });
        }

     


        // get project data with organization
        let data = await Project.findOne({
            include: [{ 
                model: Organization, 
                as: 'organization',
                required: false
            }],
            where:{
                project_uid:project_uid
              },
        });
        if(data){
            let api_key = data.organization.openai_key;
            if(api_key==null || api_key==''){
                return res.status(400).send({"type":"RXERROR","message":"api_key has invalid or undefined value"})
            }
            api_key  = await decrypt(api_key);

                let training_file                = input.training_file;
                let model                        = input.model;
                let name                         = input.name;

                let modelConfigData={
                    training_file : training_file,
                    model         : model,
                    suffix        : name,
                }

                // String file same as training file
                if(isset(input.validation_file,false)){
                    modelConfigData.validation_file=input.validation_file;
                }
                // Integer (Default:4, Max:10)
                if(isset(input.n_epochs,false)){
                    modelConfigData.n_epochs=input.n_epochs;
                }
                // Number (Default:Null)
                if(isset(input.batch_size,false)){
                    modelConfigData.n_epochs=input.n_epochs;
                }
                // Integer (Default:Null, Range 0.02 to 0.2)
                if(isset(input.learning_rate_multiplier,false)){
                    modelConfigData.learning_rate_multiplier=input.learning_rate_multiplier;
                }
                // number (Default:0.01, Range 0.01 to 1)
                if(isset(input.prompt_loss_weight,false)){
                    modelConfigData.prompt_loss_weight=input.prompt_loss_weight;
                }
                // boolean (Default:false)
                if(isset(input.compute_classification_metrics,false)){
                    modelConfigData.compute_classification_metrics=input.compute_classification_metrics;
                }
                // integer (Default:null)
                if(isset(input.classification_n_classes,false)){
                    modelConfigData.classification_n_classes=input.classification_n_classes;
                }
                // string (Default:null)
                if(isset(input.classification_positive_class,false)){
                    modelConfigData.classification_positive_class=input.classification_positive_class;
                }
                // array (Default:null)
                if(isset(input.classification_betas,false)){
                    modelConfigData.classification_positive_class=input.classification_positive_class.split(",");
                }
     
                try{
                    const configuration = new Configuration({
                        apiKey: api_key
                    });
                    const openai = new OpenAIApi(configuration);
                    const response = await openai.createFineTune(modelConfigData);
                    return res.status(200).send({"type":"RXSUCCESS","message":"Fine-tune created successfully","data":response['data']})
                }catch(error){
                    // Check for specific error or status
                    if (error.response) {
                        // // The request was made and the server responded with a status code
                        // // that falls out of the range of 2xx
                        // console.log(error.response.data);
                        // console.log(error.response.status);
                        // console.log(error.response.headers);
                        if(isset(error.response.data,false) && isset(error.response.data.error,false)){
                            return res.status(400).send({"type":"RXERROR","message":error.response.data.error.message})
                        }else{
                            return res.status(400).send({"type":"RXERROR","message":"","data":error.response.data})
                        }
                  
                    } else if (error.request) {
                        // // The request was made but no response was received
                        // console.log(error.request);
                        return res.status(400).send({"type":"RXERROR","message":error.request})
                    } else {
                        // // Something happened in setting up the request that triggered an error
                        // console.log('Error', error.message);
                        return res.status(400).send({"type":"RXERROR","message":error.message})
                    }
                }
             

         
        }else{
            return res.status(400).send({"type":"RXERROR","message":"Something went wrong"})
        }
        
    }

    async getFineTunes(req,res){
        let input = req.body;
        let id = input.id;
        let file_id = input.file_id
        let project_uid = input.project_uid;
        let result = validateParameters(["project_uid"], input);
        if (result != 'valid') {
            let error = formatJoiError(result.errors);
            return res.status(400).send({
                type: "RXERROR",
                message: "Invalid params",
                errors: error
            });
        }
        let data = await Project.findOne({
            include: [{ 
                model: Organization, 
                as: 'organization',
                required: false
            }],
            where:{
                project_uid:project_uid
              },
        });
        if(data){
            let api_key = data.organization.openai_key;
            if(api_key==null || api_key==''){
                return res.status(400).send({"type":"RXERROR","message":"api_key has invalid or undefined value"})
            }
            api_key  = await decrypt(api_key);
            const configuration = new Configuration({
                apiKey: api_key
            });
            const openai = new OpenAIApi(configuration);
            const response = await openai.listFineTunes();
          
            return res.status(200).send({"type":"RXSUCCESS","message":"Get Fine-tune by id","data":response['data']['data']})
        }else{
            return res.status(400).send({"type":"RXERROR","message":"Something went wrong","error":err})
        }
    }

    
    /**
     * Get fine tune detail by id
     * @param {*} req 
     * @param {*} res 
     * @returns 
     */
    async getFineTuneDetail(req,res){
        // request body
        let input = req.body;
        let id = input.id;
        let file_id = input.file_id
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
        };
        // get project data with organization
        let data = await Project.findOne({
            include: [{ 
                model: Organization, 
                as: 'organization',
                required: false
            }],
            where:{
                project_uid:project_uid
              },
        });
        if(data){
            let api_key = data.organization.openai_key;
            if(api_key==null || api_key==''){
                return res.status(400).send({"type":"RXERROR","message":"api_key has invalid or undefined value"})
            }
            api_key  = await decrypt(api_key);
            const configuration = new Configuration({
                apiKey: api_key
            });
            const openai = new OpenAIApi(configuration);
            const response = await openai.retrieveFineTune(id);
            return res.status(200).send({"type":"RXSUCCESS","message":"Get Fine-tune by id","data":response['data']})
        }else{
            return res.status(400).send({"type":"RXERROR","message":"Something went wrong"})
        }
    }
    
     
    /**
     * Create completion or play ground
     * @param {*} req 
     * @param {*} res 
     * @returns 
     */
    async playground(req,res){
        // request body
        let input = req.body;
        let id = input.id;
        let file_id = input.file_id
        let inject_restart_text = input.inject_restart_text;
        let project_uid = input.project_uid;
        let parameter = {};
        let chat_paramter = {}
        // check parameter validation
        let result = validateParameters(["project_uid","model","mode"], input);
        if (result != 'valid') {
            let error = formatJoiError(result.errors);
            return res.status(400).send({
                type: "RXERROR",
                message: "Invalid params",
                errors: error
            });
        }
        // check mode 
        if(input.mode=="completion"){
            if(!input.prompt){
                return res.status(400).send({type:"RXERROR",message:"prompt cannot be blank"});
            }
        }
        // get project data with organization
        let data = await Project.findOne({
            include: [{ 
                model: Organization, 
                as: 'organization',
                required: false
            }],
            where:{
                project_uid:project_uid
              },
        });
        if(data){
            let api_key = data.organization.openai_key;
            if(api_key==null || api_key==''){
                return res.status(400).send({"type":"RXERROR","message":"api_key has invalid or undefined value"})
            }
            api_key  = await decrypt(api_key);
            const configuration = new Configuration({
                apiKey: api_key
            });
            const openai = new OpenAIApi(configuration);
            let model = input.model;
            parameter.model = input.model;
            let prompt = input.prompt;
            parameter.prompt= input.prompt.concat(inject_restart_text);
            
            if(isset(input.suffix,false)){
                parameter.suffix = input.suffix;

            }
        
            
            if(isset(input.max_tokens,false)){
                parameter.max_tokens = parseInt(input.max_tokens);
            }

            if(isset((input.temperature,false))){
                parameter.temperature = parseInt(input.temperature);
            }
            // let top_p = (input.top_p !== undefined && input.top_p !== null) ? parseInt(input.top_p) : 1; // We generally recommend altering this or temperature but not both
            if(isset(input.n,false)){
                parameter.n= parseInt(input.n)
            }
            if(isset(input.stream,false)){
                parameter.stream=Boolean(input.stream);
            }
            if(isset(input.logprobs,false)){
                parameter.logprobs = parseInt(input.logprobs);
            }
            if(isset(input.echo,false)){
                parameter.echo = Boolean(input.echo);
            } 
            if(isset(input.stop,false)){
                parameter.stop = input.stop;
            }
            if(isset(input.presence_penalty,false)){
                parameter.presence_penalty = parseInt(input.presence_penalty)
            }           
            if(isset(input.frequency_penalty,false)){
                parameter.frequency_penalty = parseInt(input.frequency_penalty);
            }
            if(isset(input.best_of,false)){
                parameter.best_of = parseInt(input.best_of)
            }
            // check mode if mode will be chat create chat completion
            if(input.mode=='chat'){
                chat_paramter.model = input.model;
                chat_paramter.messages= input.messages;
                chat_paramter.temperature = parameter.temperature;
                chat_paramter.n = parameter.n;
                chat_paramter.stream = parameter.stream;
                chat_paramter.stop = parameter.stop;
                chat_paramter.max_tokens = parameter.max_tokens;
                chat_paramter.presence_penalty = parameter.presence_penalty;
                chat_paramter.frequency_penalty = parameter.frequency_penalty;
                if(!input.messages){
                    return res.status(400).send({type:"RXERROR",message:"messages cannot be blank"});
                }
                chat_paramter.messages = JSON.parse(input.messages);
                const completion = await openai.createChatCompletion(
                   chat_paramter
                );
                return res.status(200).send({"type":"RXSUCCESS","message":"Chat completion created successfully","data":completion.data});
            }else{  //if mode will not be chat then create playground 
                const response = await openai.createCompletion(
                    parameter
                );
                return res.status(200).send({"type":"RXSUCCESS","message":"Play ground created successfully","data":response['data']})
            }
        }else{
            return res.status(400).send({"type":"RXERROR","message":"Project not found"})
        }  
    }
    
    /**
     * Cancel fine-tune by id
     * @param {*} req 
     * @param {*} res 
     * @returns 
     */
    async cancelFineTune(req,res){
        // request body
        let input = req.body;
        let fine_tune_id = input.fine_tune_id;
        let project_uid = input.project_uid;
        // check parameter validation
        let result = validateParameters(["project_uid","fine_tune_id"], input);
        if (result != 'valid') {
            let error = formatJoiError(result.errors);
            return res.status(400).send({
                type: "RXERROR",
                message: "Invalid params",
                errors: error
            });
        };
        // get project data with organization
        let data = await Project.findOne({
            include: [{ 
                model: Organization, 
                as: 'organization' ,
            }],
            where:{
                project_uid:project_uid
              },
        });
        if(data){
            // get api_key from data
            let api_key = data.organization.openai_key;
            if(api_key==null || api_key==''){
                return res.status(400).send({"type":"RXERROR","message":"api_key has invalid or undefined value"})
            }
            api_key  = await decrypt(api_key);
            const configuration = new Configuration({
                apiKey: api_key
            });
            try{
                const openai = new OpenAIApi(configuration);
                const response = await openai.cancelFineTune(fine_tune_id);
                // return 200 
                return res.status(200).send({"type":"RXSUCCESS","message":"Fine-tune cancelled successfully","data":response['data']})

            }catch(err){
                // return 400
                return res.status(400).send({"type":"RXERROR","message":"This Fine-tune cancelled already"})
            }
        }else{
            // return 400 
            return res.status(400).send({"type":"RXERROR","message":"Project not found"})
        }

    }

    /**
     * Get Fine-tune events by fine-tune id 
     * @param {*} req 
     * @param {*} res 
     * @returns 
     */
    async getFineTuneEvents(req,res){
        // request body
        let input = req.body;
        let fine_tune_id = input.fine_tune_id;
        let project_uid = input.project_uid;
        // check parameter validation
        let result = validateParameters(["project_uid","fine_tune_id"], input);
        if (result != 'valid') {
            let error = formatJoiError(result.errors);
            return res.status(400).send({
                type: "RXERROR",
                message: "Invalid params",
                errors: error
            });
        }
        // get project data with organization
        let data = await Project.findOne({
            include: [{ 
                model: Organization, 
                as: 'organization' ,
            }],
            where:{
                project_uid:project_uid
              },
        });
        if(data){
            // get api_key from data
            let api_key = data.organization.openai_key;
            if(api_key==null || api_key==''){
                return res.status(400).send({"type":"RXERROR","message":"api_key has invalid or undefined value"})
            }
            api_key  = await decrypt(api_key);
            const configuration = new Configuration({
                apiKey: api_key
            });
            const openai = new OpenAIApi(configuration);
            const response = await openai.listFineTuneEvents(fine_tune_id);
            // return 200 
            return res.status(200).send({"type":"RXSUCCESS","message":"Get Fime-tune events","data":response['data']['data']})
        }else{
            // return 400 
            return res.status(400).send({"type":"RXERROR","message":"Project not found"})
        }

    }
     

    /**
     * Delete Fine-tune model by id
     * @param {*} req 
     * @param {*} res 
     * @returns 
     */
    async deleteFineTuneModel(req,res){
        // request body
        let input = req.body;
        let fine_tune_model_id = input.fine_tune_model_id;
        let project_uid = input.project_uid;
        // check parameter validation
        let result = validateParameters(["project_uid","fine_tune_model_id"], input);
        if (result != 'valid') {
            let error = formatJoiError(result.errors);
            return res.status(400).send({
                type: "RXERROR",
                message: "Invalid params",
                errors: error
            });
        }
        // get project data with organization
        let data = await Project.findOne({
            include: [{ 
                model: Organization, 
                as: 'organization' ,
            }],
            where:{
                project_uid:project_uid
              },
        });
        if(data){
            // get api_key from data
            let api_key = data.organization.openai_key;
            if(api_key==null || api_key==''){
                return res.status(400).send({"type":"RXERROR","message":"api_key has invalid or undefined value"})
            }
            api_key  = await decrypt(api_key);
            const configuration = new Configuration({
                apiKey: api_key
            });
            try{
                const openai = new OpenAIApi(configuration);
                const response = await openai.deleteModel(fine_tune_model_id);
                // return 200 
                return res.status(200).send({"type":"RXSUCCESS","message":"Fine-tune model deleted successfully","data":response['data']})

            }catch(err){
                return res.status(400).send({"type":"RXERROR","message":"This model does not exist"})
            }
        }else{
            // return 400 
            return res.status(400).send({"type":"RXERROR","message":"Project not found"})
        }

    }

    /**
     * Delete file by file id 
     * @param {*} req 
     * @param {*} res 
     * @returns 
     */
    async deleteFile(req,res){
        // request body
        let input = req.body;
        let file_id = input.file_id;
        let project_uid = input.project_uid;
        // check parameter validation
        let result = validateParameters(["project_uid","file_id"], input);
        if (result != 'valid') {
            let error = formatJoiError(result.errors);
            return res.status(400).send({
                type: "RXERROR",
                message: "Invalid params",
                errors: error
            });
        }
        // get project data with organization
        let data = await Project.findOne({
            include: [{ 
                model: Organization, 
                as: 'organization' ,
            }],
            where:{
                project_uid:project_uid
              },
        });
        if(data){
            // get api_key from data
            let api_key = data.organization.openai_key;
            if(api_key==null || api_key==''){
                return res.status(400).send({"type":"RXERROR","message":"api_key has invalid or undefined value"})
            }
            api_key  = await decrypt(api_key);
            const configuration = new Configuration({
                apiKey: api_key
            });
            const openai = new OpenAIApi(configuration);
            try {
                const response = await openai.deleteFile(file_id);
                // return 200
                return res.status(200).send({"type":"RXSUCCESS","message":"File deleted successfully","data":response['data']}) 
            } catch (error) {
                // return 400
                return res.status(400).send({"type":"RXERROR","message":"File not found","error":error});
            }
        }else{
            // return 200
            return res.status(400).send({"type":"RXERROR","message":"Project not found"})
        }
    }
};

// ******************************************************************************##LLPP
