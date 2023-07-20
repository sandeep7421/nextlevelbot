let express = require("express");
let router = express.Router();
let Auth = middleware('Auth');
let APIAuth = middleware('APIAuth');
let IntegrationAuth = middleware('IntegrationAuth');



let termAndPrivacy = controller("Api/Outer/TermAndPrivacyController");

let user = controller("Api/Users/User/UserController");
let organization = controller("Api/Users/Organization/OrganizationController");
let project = controller("Api/Users/Project/ProjectController");
let QAExpert = controller("Api/Users/Product/QAExpertController");
let Sharelink = controller("Api/Users/Integration/ShareLinkController");
let projectIndex = controller("Api/Users/Project/ProjectIndexController");
let projectSiteMap = controller("Api/Users/Project/ProjectSiteMapController");
let projectUrl = controller("Api/Users/Project/ProjectUrlController");
let projectFile = controller("Api/Users/Project/ProjectFileController");
let projectDomain = controller("Api/Users/Project/ProjectDomainController");
let projectMember = controller("Api/Users/Project/ProjectMemberController");
let projectIntegration = controller("Api/Users/Project/ProjectIntegrationController");
let prompt = controller("Api/Users/Project/PromptController");


let contact_us = controller("Api/Outer/ContactUsController");
let session = controller("Api/Users/Project/SessionController");
let contact = controller("Api/Users/Project/ContactController");
let openai = controller("Api/Users/SimpleTuning/OpenAIController");
let api_integration = controller("Api/Users/Integration/ApiIntegrationController");
let integration = controller("Api/Users/Integration/IntegrationController");
let discord = controller("Api/Users/Integration/DiscordController");
let telegram = controller("Api/Users/Integration/TelegramController");
let slack = controller("Api/Users/Integration/SlackController");
let chatbot = controller("Api/Users/Integration/ChatbotController");
let zapier = controller("Api/Users/Integration/ZapierController");

let Subscription = controller("Api/Users/Subscription/SubscriptionController");
let Invoice = controller("Api/Users/Subscription/InvoiceController");



router.post("/subscribeMe", [], (req, res) => {
  return user.subscribeMe(req, res);
});

router.post("/socialLogin", [], (req, res) => {
  return user.socialLogin(req, res);
});

router.post("/login", [], (req, res) => {
  return user.login(req, res);
});

router.post("/updateProfile", [Auth], (req, res) => {
  return user.updateProfile(req, res);
});

router.post("/register", [], (req, res) => {
  return user.register(req, res);
});

router.post("/sendResetEmail", [], (req, res) => {
  return user.sendResetEmail(req, res);
});

router.post("/resetPassword", [], (req, res) => {
  return user.resetPassword(req, res);
});

router.post("/changePassword", [Auth], (req, res) => {
  return user.changePassword(req, res);
});

router.post("/verifyEmail", [], (req, res) => {
  return user.verifyEmail(req, res);
});

router.post("/resendEmailVerification", (req, res) => {
  return user.resendEmailVerification(req, res);
});


router.post("/getDetail", [Auth], (req, res) => {
  return user.getDetail(req, res);
});

router.post("/createOrganization", [Auth], (req, res) => {
  return organization.createOrganization(req, res);
});

router.post("/inviteOrganizationMember", [Auth], (req, res) => {
  return organization.inviteOrganizationMember(req, res);
});

router.post("/addOrganizationMemeberViaHash", [Auth], (req, res) => {
  return organization.addOrganizationMemeberViaHash(req, res);
});

router.post("/getMyOrganizations", [Auth], (req, res) => {
  return organization.getMyOrganizations(req, res);
});

router.post("/updateOrganization", [Auth], (req, res) => {
  return organization.updateOrganization(req, res);
});

router.post("/removeOrganizationMember", [Auth], (req, res) => {
  return organization.removeOrganizationMember(req, res);
});

router.post("/getOrganizationMembers", [Auth], (req, res) => {
  return organization.getOrganizationMembers(req, res);
});

router.post("/getOrganizationDetail", [Auth], (req, res) => {
  return organization.getOrganizationDetail(req, res);
});

router.post("/deleteOrganization", [Auth], (req, res) => {
  return organization.deleteOrganization(req, res);
});


router.post("/createProject", [Auth], (req, res) => {
  return project.createProject(req, res);
});

router.post("/deleteProject", [Auth], (req, res) => {
  return project.deleteProject(req, res);
});


router.post("/updateProject", [Auth], (req, res) => {
  return project.updateProject(req, res);
});

router.post("/getProjectDetail", [Auth], (req, res) => {
  return project.getProjectDetail(req, res);
});



router.post("/getMyProjects", [Auth], (req, res) => {
  return project.getMyProjects(req, res);
});

router.post("/generateProjectKey", [Auth], (req, res) => {
  return project.generateProjectKey(req, res);
});

router.post("/getProjectKey", [Auth], (req, res) => {
  return project.getProjectKey(req, res);
});

router.post("/deactivateProjectKey", [Auth], (req, res) => {
  return project.deactivateProjectKey(req, res);
});

router.post("/activateProjectKey", [Auth], (req, res) => {
  return project.activateProjectKey(req, res);
});
router.post("/deleteProjectKey", [Auth], (req, res) => {
  return project.deleteProjectKey(req, res);
})

router.post("/getProjectDetail", [Auth], (req, res) => {
  return project.getProjectDetail(req, res);
})


router.post("/createIndex", [Auth], (req, res) => {
  return projectIndex.createIndex(req, res);
});

router.post("/updateIndex", [Auth], (req, res) => {
  return projectIndex.updateIndex(req, res);
});

router.post("/deleteIndex", [Auth], (req, res) => {
  return projectIndex.deleteIndex(req, res);
});

router.post("/uploadFile", [Auth], (req, res) => {
  return projectFile.uploadFile(req, res);
});

router.post("/getProjectFiles", [Auth], (req, res) => {
  return projectFile.getProjectFiles(req, res);
});

router.post("/deleteFile", [Auth], (req, res) => {
  return projectFile.deleteFile(req, res);
});

router.post("/deleteFiles", [Auth], (req, res) => {
  return projectFile.deleteFiles(req, res);
});

router.post("/renameFile", [Auth], (req, res) => {
  return projectFile.renameFile(req, res);
});

router.post("/getProjectFileSignedUrl",[Auth], (req, res) => {
  return projectFile.getProjectFileSignedUrl(req, res);
})

router.post("/createProjectDomain",[Auth], (req, res) => {
  return projectDomain.createProjectDomain(req, res);
})

router.post("/deleteProjectDomain",[Auth], (req, res) => {
  return projectDomain.deleteProjectDomain(req, res);
})

router.post("/getProjectDomains",[Auth], (req, res) => {
  return projectDomain.getProjectDomains(req, res);
})

router.post("/getProjectMembers",[Auth], (req, res) => {
  return projectMember.getProjectMembers(req, res);
})

router.post("/removeProjectMember",[Auth], (req, res) => {
  return projectMember.removeProjectMember(req, res);
})

router.post("/inviteProjectMember",[Auth], (req, res) => {
  return projectMember.inviteProjectMember(req, res);
})

// *************************** ProjectSiteMap *********************

router.post("/createProjectSiteMap",[Auth], (req, res) => {
  return projectSiteMap.createProjectSiteMap(req, res);
})

router.post("/getProjectSiteMap",[Auth], (req, res) => {
  return projectSiteMap.getProjectSiteMap(req, res);
}) 

router.post("/deleteProjectSiteMap",[Auth], (req, res) => {
  return projectSiteMap.deleteProjectSiteMap(req, res);
})

router.post("/getUrlsFromSitemap",[Auth], (req, res) => {
  return projectSiteMap.getUrlsFromSitemap(req, res);
})

router.post("/sitemapUrlExtracter",[Auth], (req, res) => {
  return projectSiteMap.sitemapUrlExtracter(req, res);
})
// ********************** ProjectUrl *****************************

router.post("/createProjectUrl",[Auth], (req, res) => {
  return projectUrl.createProjectUrl(req, res);
})

router.post("/getProjectUrl",[Auth], (req, res) => {
  return projectUrl.getProjectUrl(req, res);
})


router.post("/deleteProjectUrl",[Auth], (req, res) => {
  return projectUrl.deleteProjectUrl(req, res);
})

// ***************************************************************

router.post("/chatbot/enableChatbot",[Auth], (req, res) => {
  return chatbot.enableChatbot(req, res);
})

router.post("/public/getChatbotSetting",[], (req, res) => {
  return chatbot.getChatbotSetting(req, res);
})

router.post("/discord/enableDiscord",[Auth], (req, res) => {
  return discord.enableDiscord(req, res);
})

router.post("/slack/enableSlack",[Auth], (req, res) => {
  return slack.enableSlack(req, res);
})

router.post("/zapier/enableZapier",[APIAuth], (req, res) => {
  return zapier.enableZapier(req, res);
})

router.post("/discord/updateDiscordSetting",[Auth], (req, res) => {
  return discord.updateDiscordSetting(req, res);
})

router.post("/getIntegrationSetting",[Auth], (req, res) => {
  return projectIntegration.getIntegrationSetting(req, res);
})

router.post("/chatbot/updateChatbotSetting",[Auth], (req, res) => {
  return chatbot.updateChatbotSetting(req, res);
})

router.post("/chatbot/getSignedUrl", [Auth],(req, res) => {
  return chatbot.getSignedUrl(req, res);
})
router.post("/chatbot/uploadLogo", [Auth],(req, res) => {
  return chatbot.uploadLogo(req, res);
})

router.post("/disableIntegration",[Auth], (req, res) => {
  return projectIntegration.disableIntegration(req, res);
})

router.post("/updateIntegrationSettiong",[Auth], (req, res) => {
  return projectIntegration.updateIntegrationSettiong(req, res);
})
// **********************Session*******************


router.post("/createChatbotSession",[], (req, res) => {
  return session.createChatbotSession(req, res);
});


router.post("/getSessionMessagesById",[Auth], (req, res) => {
  return session.getSessionMessagesById(req, res);
});

router.post("/getSessionMessagesBySessionId",[Auth], (req, res) => {
  return session.getSessionMessagesBySessionId(req, res);
});

router.post("/getProjectSession", [Auth],(req, res) => {
  return session.getProjectSession(req, res);
});

router.post("/getSessionNavigationLink", [Auth],(req, res) => {
  return session.getSessionNavigationLink(req, res);
});

router.post("/getSessionDetailBySessionId",[Auth],(req, res)=> {
  return session.getSessionDetailBySessionId(req, res);
});

router.post("/getStats", [Auth] ,(req, res) => {
  return session.getStats(req, res);
});

router.post("/SessionWebsiteNavigation",(req, res) => {
  return session.SessionWebsiteNavigation(req, res);
});

router.post("/sendEmailConversation",(req, res) => {
  console.log('sendEmailConversation')
  return session.sendChatBotConversationOnEmail();
});

router.post("/sessionMessageSeen",[Auth],(req, res) => {
  return session.sessionMessageSeen(req, res);
});

// **************************VistorContactController***********************

router.post("/createContact",[Auth], (req, res) => {
  return contact.createContact(req, res);
}); 

router.post("/updateContact",[Auth], (req, res) => {
  return contact.updateContact(req, res);
}); 
// ************************************************************************

router.post("/ContactUs", [], (req, res) => {
  return contact_us.ContactUs(req, res);
});


router.get("/terms", [], (req, res) => {
  return termAndPrivacy.getTermsAndCondition(req, res);
});
router.get("/privacy", [], (req, res) => {
  return termAndPrivacy.getPrivacyPolicy(req, res);
});



router.post("/refreshProjectKey", [APIAuth],(req, res) => {
  return project.refreshProjectKey(req, res);
});

router.post("/updateProjectSettings", [Auth],(req, res) => {
  return project.updateProjectSettings(req, res);
});
// **********************SimpleTuning*******************

router.post("/basictuning/getAllFiles", [Auth], (req, res) => {
  return openai.getAllFiles(req, res);
});


router.post("/basictuning/getFineTunes", [Auth], (req, res) => {
  return openai.getFineTunes(req, res);
});
router.post("/basictuning/getFileDetail", [Auth], (req, res) => {
  return openai.getFileDetail(req, res);
});
router.post("/basictuning/getFileContent", [Auth], (req, res) => {
  return openai.getFileContent(req, res);
});


router.post("/basictuning/getAllModels", [Auth], (req, res) => {
  return openai.getAllModels(req, res);
});

router.post("/basictuning/createFineTune", [Auth], (req, res) => {
  return openai.createFineTune(req, res);
});


router.post("/basictuning/cancelFineTune", [Auth], (req, res) => {
  return openai.cancelFineTune(req, res);
});

router.post("/basictuning/getFineTuneDetail", [Auth], (req, res) => {
  return openai.getFineTuneDetail(req, res);
});

router.post("/basictuning/playground", [Auth], (req, res) => {
  return openai.playground(req, res);
});

router.post("/basictuning/getFineTuneEvents", [Auth], (req, res) => {
  return openai.getFineTuneEvents(req, res);
});

router.post("/basictuning/deleteFineTuneModel", [Auth], (req, res) => {
  return openai.deleteFineTuneModel(req, res);
});
router.post("/basictuning/getProjectFileSignedUrl", [Auth], (req, res) => {
  return openai.getProjectFileSignedUrl(req, res);
});
router.post("/basictuning/uploadFile", [Auth], (req, res) => {
  return openai.uploadFile(req, res);
});


router.post("/basictuning/deleteFile", [Auth], (req, res) => {
  return openai.deleteFile(req, res);
});

router.post("/basictuning/uploadFile",[Auth],(req, res) => {
  return openai.uploadFile(req, res);
});
// *********************API Integration ************************ 
router.post("/enableApiIntegration", [Auth], (req, res) => {
  return api_integration.enableApiIntegration(req, res);
});

router.post("/createSession", [APIAuth], (req, res) => {
  return api_integration.createSession(req, res);
});

router.post("/query",[APIAuth], (req, res) => {
  return api_integration.query(req, res);
});

router.post("/endSession", [APIAuth],(req, res) => {
  return api_integration.endSession(req, res);
});

router.post("/advancePlayground", [Auth],(req, res) => {
  return api_integration.playground(req, res);
});

// *********************** TelegramController ******************

router.post("/telegram/query_telegram",[IntegrationAuth], (req, res) => {
  return telegram.query_telegram(req, res);
});

router.post("/telegram/enableTelegram",[Auth], (req, res) => {
  return telegram.enableTelegram(req, res);
});

router.post("/telegram/updateTelegramSetting",[Auth], (req, res) => {
  return telegram.updateTelegramSetting(req, res);
});

router.post("/telegram/endTelegramSession",[IntegrationAuth], (req, res) => {
  return telegram.endTelegramSession(req, res);
});

// *********************QUERY***********************************

router.post("/discord/query_discord",[IntegrationAuth], (req, res) => {
  return discord.query_discord(req, res);
});

router.post("/discord/endDiscordSession",[IntegrationAuth], (req, res) => {
  return discord.endDiscordSession(req, res);
})

router.post("/slack/query_slack", [IntegrationAuth], (req, res) => {
  return slack.query_slack(req, res);
});

router.post("/slack/endSlackSession",[IntegrationAuth], (req, res) => {
  return slack.endSlackSession(req, res);
})

router.post("/chatbot/query_chatbot",[], (req, res) => {
  return chatbot.query_chatbot(req, res);
}); 

router.post("/chatbot/endChatbotSession", [],(req, res) => {
  return chatbot.endChatbotSession(req, res);
})

router.post("/chatbot/rateMessage", [] ,(req, res) => {
  return chatbot.rateMessage(req, res);
});

router.post("/chatbot/createWidgetFormField", [Auth] ,(req, res) => {
  return chatbot.createWidgetFormField(req, res);
});

router.post("/chatbot/updateWidgetFormField", [Auth] ,(req, res) => {
  return chatbot.updateWidgetFormField(req, res);
});

router.post("/chatbot/deleteWidgetFormField", [Auth] ,(req, res) => {
  return chatbot.deleteWidgetFormField(req, res);
});

router.post("/zapier/query_zapier", [APIAuth], (req, res) => {
  return zapier.query_zapier(req, res);
});


router.post("/zapier/endZapierSession", [APIAuth],(req, res) => {
  return zapier.endZapierSession(req, res);
});

router.post("/zapier/createZapierSession", [APIAuth],(req, res) => {
  return zapier.createZapierSession(req, res);
});

router.post("/getIntegration", [], (req, res) => {
  return integration.getIntegration(req, res);
});

router.post("/getProjectIntegrationIds", [], (req, res) => {
  return integration.getProjectIntegrationIds(req, res);
});

router.post("/getMyIntegration",[Auth], (req, res) => {
  return integration.getMyIntegration(req, res);
})

router.post("/getOtherIntegration",[Auth], (req, res) => {
  return integration.getOtherIntegration(req, res);
})


// ****************************Prompt*****************************

router.post("/getPrompt", [], (req, res) => {
  return prompt.getPrompt(req, res);
});


// subscription routes

router.post("/createSubscription", [Auth], (req, res) => {
  return Subscription.createSubscription(req, res);
})

router.post("/createEliteSubscription", [], (req, res) => {
  return Subscription.createEliteSubscription(req, res);
})

router.post("/cancelSubscription", [Auth], (req, res) => {
  return Subscription.cancelSubscription(req, res);
})

router.post("/subscriptionWebHook", [], (req, res) => {
  return Subscription.subscriptionWebHook(req, res);
})

router.post("/getAllSubscription", [], (req, res) => {
  return Subscription.getAllSubscription(req, res);
})

router.post("/getSubscription", [Auth], (req, res) => {
  return Subscription.getSubscription(req, res);
})

router.post("/getActivePlanDetail", [Auth], (req, res) => {
  return Subscription.getActivePlanDetail(req, res);
})

router.post("/updateSubscription", [Auth], (req, res) => {
  return Subscription.updateSubscription(req, res);
})

router.post("/getTrailEndUser", [], (req, res) => {
  return Subscription.getTrailEndUser(req, res);
})

router.post("/sendEmailTrailEndUser", [], (req, res) => {
  return Subscription.sendEmailTrailEndUser(req, res);
})

router.post("/getInvoiceByProjectId", [Auth], (req, res) => {
  return Invoice.getInvoiceByProjectId(req, res);
});

router.post("/getInvoiceByOrganization", [Auth], (req, res) => {
  return Invoice.getInvoiceByOrganization(req, res);
});

router.get("/status", [], (req, res) => {
  return res.status(200).send({status:"ok"});
});

// ------- QA_EXPERT ----- //

router.post("/createWorkSpace", [Auth], (req, res) => {
  return QAExpert.createWorkSpace(req, res);
});

router.post("/getMyWorkSpaces", [Auth], (req, res) => {
  return QAExpert.getMyWorkSpaces(req, res);
});

router.post("/getWorkSpaceDetail", [Auth], (req, res) => {
  return QAExpert.getWorkSpaceDetail(req, res);
});

router.post("/updateWorkSpace", [Auth], (req, res) => {
  return QAExpert.updateWorkSpace(req, res);
});

router.post("/deleteWorkSpace", [Auth], (req, res) => {
  return QAExpert.deleteWorkSpace(req, res);
});

router.post("/refreshShareLinkHash", [Auth], (req, res) => {
  return QAExpert.refreshShareLinkHash(req, res);
});

router.post("/getWorkSpaceShareLink", [Auth], (req, res) => {
  return QAExpert.getWorkSpaceShareLink(req, res);
});

// ------- SHARE_LINK_SESSION ------- //

router.post("/createShareLinkSession",[], (req, res) => {
  return Sharelink.createShareLinkSession(req, res);
})

router.post("/getShareLinkMessagesBySessionId",[], (req, res) => {
  return Sharelink.getShareLinkMessagesBySessionId(req, res);
})

router.post("/getShareLinkDetailBySessionId",[], (req, res) => {
  return Sharelink.getShareLinkDetailBySessionId(req, res);
})

module.exports = router;