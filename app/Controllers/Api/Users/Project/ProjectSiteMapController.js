const { Session,Project,SessionMessage,ProjectSiteMap,sequelize,ProjectUrl} = require("../../../../Models");
let { formatJoiError, isset, validateParameters,getIpDetail,getProject,checkDocumentCount,addToIndexQueue,checkOrganizationLimit,increaseLimit } = require(baseDir() + "helper/helper");
let Sequelize = require("sequelize");
const Op = Sequelize.Op;
let sha256 = require("sha256");
let moment = require("moment");
let Joi = require("@hapi/joi");
let md5 = require("md5");
const { v4: uuidv4 } = require('uuid');

const xml2js = require('xml2js');
const fetch = require('node-fetch');

module.exports = class ProjectSiteMapController {

    /**
     * Create project sitemaps
     * @param {*} req 
     * @param {*} res 
     * @returns 
     */
    async createProjectSiteMap(req,res){
      // request body
        let input = req.body;
        let project_uid = input.project_uid;
        // validate input parameters
        let result = validateParameters(["project_uid","site_map_url"], input);
        if (result != 'valid') {
            let error = formatJoiError(result.errors);
            return res.status(400).send({
                type: "RXERROR",
                message: "Invalid params",
                errors: error
            });
        }
        // const urlRegex = /^(?:https?):\/\/(?:[\w-]+\.)+[\w]{2,}(?:\S+)?$/i;

        // only .xml url is allowed
        const urlRegex = /^(?:https?):\/\/(?:[\w-]+\.)+[\w]{2,}(?:\S+)?\.xml$/i;
        const siteMapUrl = input.site_map_url.toLowerCase(); //if url find in uppercase then change it into lowercase
        // validate url
        if (!urlRegex.test(siteMapUrl)) {
          return res.status(400).send({ type:"RXERROR",message:"Please provide a vaild site_map_url" })
        }
        // call getProject function to get project_id
        let project_data = await getProject(res,project_uid);
        let project_id = project_data.id;
        let organization_id = project_data.organization_id;
        let app_id = project_data.app_id;

        let usage_type,valdateLimit=false;
        switch (app_id) {
            case 1:
                usage_type = "webpages"
                valdateLimit=true;
                break;
            default:
                break;
        }
        console.log(valdateLimit);
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

        // find project_sitemap data on the base of project_id and sitemap_url
        let projectSiteMapCheck = await ProjectSiteMap.findOne({
          where: {
            project_id: project_id,
            site_map_url: siteMapUrl
          }
        })
        // if project_sitamap data found return error
        if (projectSiteMapCheck) {
          return res.status(400).send({
              type: "RXERROR",
              message: "This site_map_url already exist"
          })
        }

        const url_length = await this.getUrllength(siteMapUrl)
       
        console.log(url_length.url_length,"+++++++++++++++**");
        console.log(data.limit_left);
        console.log(data);
        const limitLeft = data.data[0].limit_left
        if (limitLeft < url_length.url_length) {
          return res.status(409).send({
              type: "RXERROR",
              message: `You don't have sufficient remaining limit to create.`
          })
        }
        
        try {
          // if project_sitemap data not found then create 
          let sitamap_data = await ProjectSiteMap.create({
            project_id: project_id,
            site_map_url: siteMapUrl
          });
          // call getUrlsFromSitemap , it will create urls in project_urls
          let url_sitemap = await this.getUrlsFromSitemap(req,res,sitamap_data,project_data);
          
          if(url_sitemap){
            sitamap_data = JSON.parse(JSON.stringify(sitamap_data));
            sitamap_data.project_urls = url_sitemap
            let by
            await increaseLimit(by=url_length.url_length,{app_id : app_id , organization_id : project_data.organization_id , usage_type : "webpages"})
          }
          await addToIndexQueue("addProjectURL",url_sitemap)
          // return 200
          return res.status(200).send({ type:"RXSUCCESS",message:"ProjectSiteMap created successfully",data:sitamap_data})
        } catch (err) {
            console.log(err)
              // return 400
            return res.status(400).send({ type:"RXERROR",message:"Something went wrong" })
        }

    }

    /**
     * This function will create urls in project_urls
     * @param {*} res 
     * @param {*} sitamap_data 
     * @returns 
     */
    async  getUrlsFromSitemap(req,res,sitamap_data,project_data) {

      let current_date = moment().format("YYYY-MM-DD HH:mm:ss");
      let user_id = req.authUser.user_id

      // console.log(sitamap_data,"++++++++++++++++++")
  
      let url = sitamap_data.site_map_url;
      let project_id = sitamap_data.project_id;
      let site_map_id = sitamap_data.id;
      let organization_id = project_data.organization_id
      // console.log(project_id,"++++++project_id++++++")
      
      const url_length = await this.getUrllength(url)
       
      console.log(url_length.url_length,"+++++++++++++++**");

      // let message = await checkDocumentCount(res,project_id,url_length);
      // // console.log("Message::::::::::",message)
      // if(message){
      //   return message;
      // }
      let app_id = project_data.app_id
      let usage_type,valdateLimit=false;
        switch (app_id) {
            case 1:
                usage_type = "webpages"
                valdateLimit=true;
                break;
            default:
                break;
        }
        console.log(valdateLimit);
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

      

      // if(urls){
      //   let message = await checkDocumentCount(res,project_id)
      //   console.log(message)
      // }
      // dd()

      // console.log('Extracted URLs from sitemap:', urls);
      console.log("1+++++++++++++++++++");
      const extracted_urls = url_length.urls.map(url => ({ url, project_id: project_id,site_map_id:site_map_id ,user_id : user_id }));
      console.log("2+++++++++++++++++++");
      let data = await ProjectUrl.bulkCreate(extracted_urls, { ignoreDuplicates: true });

      if(data){
        console.log({message: "Sitemap url data have been saved", data: data});

        await ProjectSiteMap.update({
          link_count:url_length.url_length,last_updated : current_date},
          {
            where:{
              project_id:project_id,
              id:site_map_id
            }
          })
        return data 
          // return res.status(200).send({type: "RXSUCCESS", message: "Sitemap url data have been saved", data: data});
      }else{
        console.log("3+++++++++++++++++++");
        console.log({ERROR:"Something went wrong"})
          // return res.status(400).send({type: "RXERROR", message: "Something went wrong"});
      }
    }

  async  getUrllength(url) {
      let sitemapXML = await fetch(url).then(response => response.text()); 
      // Parse the top-level sitemap XML
      let result = await new Promise(async(resolve,reject)=>{
        xml2js.parseString(sitemapXML, async (err, result) => { 
            resolve(result)
        });
      }) 

      // Extract URLs from the top-level sitemap JSON object
      const urls = await this.extractUrlsFromSitemap(result);
      let url_length = urls.length;
      return { urls :urls , url_length : url_length }
    }
   
    /**
     * Extract urls from sitemap
     * @param {*} sitemapObject 
     * @returns 
     */
    async  extractUrlsFromSitemap(sitemapObject) {
      const urls = [];
    
      if (sitemapObject.urlset && sitemapObject.urlset.url) {
        const urlArray = sitemapObject.urlset.url;
        for (const urlObject of urlArray) {
            const url = urlObject.loc[0];
            if (!url.endsWith('.xml')) { // Exclude URLs ending with ".xml"
              urls.push(url);
            }
        }
      }
    
      if (sitemapObject.sitemapindex && sitemapObject.sitemapindex.sitemap) {
        const sitemapArray = sitemapObject.sitemapindex.sitemap;
        const promises = sitemapArray.map(sitemap => {
          return fetch(sitemap.loc[0])
            .then(response => response.text())
            .then(sitemapXML => {
              return new Promise((resolve, reject) => {
                xml2js.parseString(sitemapXML, (err, result) => {
                  if (err) {
                    reject(err);
                  } else {
                    resolve(extractUrlsFromSitemap(result));
                  }
                });
              });
            })
            .catch(error => {
              console.error(`Failed to fetch and parse sitemap XML: ${sitemap.loc[0]}`, error);
              return [];
            });
        });
    
        return Promise.all(promises).then(nestedUrls => {
          for (const nestedUrlArray of nestedUrls) {
            urls.push(...nestedUrlArray);
          }
          return urls;
        });
      }
    
      return urls;
    }
    
    /**
     * Get project sitemap on the base of project_uid
     * @param {*} req 
     * @param {*} res 
     * @returns 
     */
    async getProjectSiteMap(req,res){
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
        //  find project_sitemap data on the base of project_id
        let data = await ProjectSiteMap.findAll({
            where:{
                project_id:project_id
            }
        })
        if(data){
          // return 200
            return res.status(200).send({ type:"RXSUCCESS",message:"Get ProjectSiteMap data",data:data })
        }else{
          // return 400
          return res.status(400).send({ type:"RXERROR",message:"Something went wrong" })
        }
    }
  
    /**
     * Delete project_sitemap on the base of id and project_uid
     * @param {*} req 
     * @param {*} res 
     * @returns 
     */
    async deleteProjectSiteMap(req,res){
        // request body
        let input = req.body;
        let id = input.id;
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
        // find project_data on the base of project_uid to get project_id
        let project_data = await Project.findOne({
          where:{
              project_uid:input.project_uid
          }
        })
        let project_id = project_data.id;
        // delete project_sitemap data on the base of id and project_id
        let data = await ProjectSiteMap.destroy({
            where:{
                id:id,
                project_id:project_id
            }
        })
        if(data){
            // return 200
            return res.status(200).send({ type:"RXSUCCESS",message:"ProjectSiteMap deleted successfully" })
        }else{
            // return 400
            return res.status(400).send({ type:"RXERROR",message:"Not found" })
        }
    }


    async sitemapUrlExtracter(req,res){
      let input = req.body;
      let url = input.sitemap_url;


      const urlRegex = /^(?:https?):\/\/(?:[\w-]+\.)+[\w]{2,}(?:\S+)?\.xml$/i;
      const siteMapUrl = url.toLowerCase(); //if url find in uppercase then change it into lowercase
      // validate url
      if (!urlRegex.test(siteMapUrl)) {
        return res.status(400).send({ type:"RXERROR",message:"Please provide a vaild site_map_url" })
      }



      // let data = await ProjectSiteMap.findOne({
      //   where:{
      //     id:sitemap_id
      //   }
      // })
      // if(!data){
      //   return res.status(400).send({type:"RXERROR",message:"Invalid sitemap_id"})
      // }

      // let url = data.site_map_url;

      let sitemapXML = await fetch(siteMapUrl).then(response => response.text()); 
      // Parse the top-level sitemap XML
      let result = await new Promise(async(resolve,reject)=>{
        xml2js.parseString(sitemapXML, async (err, result) => { 
            resolve(result)
        });
      }) 

      // Extract URLs from the top-level sitemap JSON object
      const urls = await this.extractUrlsFromSitemap(result);
      let url_length = urls.length;
      // return { urls :urls , url_length : url_length }
      return res.status(200).send({type:"RXSUCCESS",message:"Extract urls",link_count:url_length,url:urls})
    }
}