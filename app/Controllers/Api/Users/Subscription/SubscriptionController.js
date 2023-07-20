const { stripe_secret_key, }=config('stripe')
const stripe = require('stripe')(stripe_secret_key)
const crypto = require("crypto")
const moment = require('moment')
let { formatJoiError, ucfirst, isset, strlen, strpos, count, authUser, in_array, rand, validateParameters, getIpDetail,loadEmailTemplate,getProject,notifyOnDiscord } = require(baseDir() + "helper/helper");
// let { updateBrevoContact } = require(baseDir() + "helper/syncContactToBrevo");
const { Op } = require('sequelize');
const Sequelize = require('sequelize');
const { Subscription,Invoice,Transaction,Discount,DiscountSubscription,UsageLimit,Project,UsageData,OrganizationMember,InvoiceLineItem,User,Setting,ProductTrial } = require("../../../../Models");
const { create } = require('@hapi/joi/lib/ref');
const nodemailer = require('nodemailer')
module.exports = class SubscriptionController {

    /**
     * 
     * @param {*} req 
     * @param {*} res 
     * 
     * create subsription by using payment url getting from checkout session 
     */
    
    async createSubscription(req, res) {

        const input = req.body
        let user_id = req.authUser.user_id;
        let email = req.authUser.User.email;
  
        // validate the params
        let result = validateParameters(["id","plan","app_id","is_trial"], input);

        if (result != 'valid') {
            let error = formatJoiError(result.errors);
            return res.status(400).send({
              type: "RXERROR",
              message: "Invalid params",
              errors: error
            });
        }
        console.log("Input logs",input)
        // if (input.plan == "chatbot_basic_monthly") {
        //     return res.status(400).send({type:"RXERROR",message:"plan not exists"})
        // }
        let ip_address = req.headers["cf-connecting-ip"] || req.headers["x-forwarded-for"] || req.connection.remoteAddress;
        
        let ip_detail = await getIpDetail(ip_address)
        let currency;
        let country;
        if(typeof ip_detail === 'undefined' || ip_detail === null){
          country = 'US'
        } else {
          country = ip_detail.country
        } 

        let app_plans = config('plan');
        let plans = app_plans.plans[input.app_id];

        if(plans==null || typeof plans=='undefined'){
            return res.status(400).send({type:"RXERROR",message:"Invalid plan or app_id"})
        }
        const plan = plans[`${input.plan}`]

        let stripe_plan_id
        if (!plan) {
            return res.status(400).send({
                type: "RXERROR",
                message: "plan must be chatbot_basic_monthly,chatbot_starter_monthly,chatbot_growth_monthly,chatbot_professional_monthly"
            });
        }
        if(country=='IN'){
            currency = 'INR';
            stripe_plan_id = plan.inr_stripe_plan_id

        }else{
            currency = 'USD',
            stripe_plan_id = plan.stripe_plan_id
        }
    
        try {

            let project_id
            let organization_id
            switch (plan.type) {
                case "organization":
                    const organization = await OrganizationMember.findOne({
                        where : {
                            organization_id : input.id,
                            user_id : user_id,
                            role : "owner"
                        }
                    })
                    if(!organization){
                        return res.status(400).send({type:"RXERROR",message:"Invalid organization_id"})
                    }
                    organization_id = input.id
                    project_id = null
                    break;
                case "project":
                    let data = await Project.findOne({
                        where : {
                            project_uid : input.id
                        }
                    })
                    if (!data) {
                        return res.status(400).send({type:"RXERROR",message:"Invalid project_uid"})
                    }
                    project_id = data.id,
                    organization_id = data.organization_id

                    break;
            
                default:
                    break;
            }

            if (plan.isFree) {
                const data = await UsageData.findAll({
                    where : {
                        app_id : input.app_id,
                        project_id : project_id,
                        organization_id : organization_id,
                    }
                })
                console.log(data.length > 0);
                if (data.length > 0) {
                    if (data[0].plan_id != "1") {
                        return res.status(400).send({
                            type:"RXERROR",
                            message:"You have a paid plan exists"
                        })
                    }
                    return res.status(400).send({
                        type:"RXERROR",
                        message:"You have a free plan exists"
                    })
                }
                const plan_benefits = JSON.stringify(plan)
                await usageDatabyAppId(input.app_id,project_id,organization_id,plan_benefits)
                await usageLimitbyAppId(input.app_id,project_id,organization_id,plan_benefits)
                const searchBy = req.authUser.User.email
                const updateBrevoContactData = await updateBrevoContact({chatbot_plan:`${input.plan}`},searchBy)
                return res.status(200).send({
                    type:"RXSUCCESS",
                    message:"free plan added successfully",
                    data : null
                })
            }

            if (input.is_trial === "true") {
                if (plan?.is_trial) {
                    const PlanData = await ProductTrial.findOne({
                        where : {
                            app_id : input.app_id,
                            organization_id : organization_id,
                            user_id : user_id,
                            project_id : project_id
                        }
                    })
                    if (PlanData) {
                        return res.status(400).send({
                            type:"RXERROR",
                            message:"You have already utilized the free trial. To continue using our services, kindly consider purchasing a paid plan."
                        })
                    }
                    const expiry_date = moment().add(7,"days").format("YYYY-MM-DD HH:mm:ss");
                    const userPlan = await ProductTrial.create({
                        app_id : input.app_id,
                        organization_id : organization_id,
                        user_id : user_id,
                        project_id : project_id,
                        plan_id : plan.plan_id,
                        expiry_date : expiry_date,
                        status : "trialing"
                    })
                    const plan_benefits = JSON.stringify(plan)
                    await usageDatabyAppId(input.app_id,project_id,organization_id,plan_benefits)
                    await usageLimitbyAppId(input.app_id,project_id,organization_id,plan_benefits)
                    const searchBy = req.authUser.User.email
                    const updateBrevoContactData = await updateBrevoContact({chatbot_plan:`${input.plan}`},searchBy)
                    return res.status(200).send({
                        type:"RXSUCCESS",
                        message:"Congratulations! You have successfully purchased a trial plan. Enjoy exploring the benefits and features it offers.",
                        data : userPlan
                    })
                }
                return res.status(400).send({
                    type:"RXERROR",
                    message:"The plan you entered does not include a trail plan."
                })
            }

            const user = await Subscription.findOne({
                where : {
                    user_id : user_id,
                },
                order : [['id','DESC']]
            })
    
            let customer
            let newCustomer
            if (user) {
                if (user.status == "active" && user.organization_id == organization_id && user.app_id == input.app_id) {
                    return res.status(400).send({
                        type:"RXERROR",
                        message:"You've already subscribed, but you have the option to upgrade",
                    }) 
                }
                customer = user.customer_id,
                newCustomer = false
            }
            else{
                customer = [],
                newCustomer = true
            }

            const successUrl = paymentRedirectionUrl("success",plan,{})
            const cancelUrl = paymentRedirectionUrl("cancel",plan,{})

            const session = await stripe.checkout.sessions.create({
                success_url: successUrl,
                cancel_url: cancelUrl,
                customer : customer,
                line_items: [
                  { price: stripe_plan_id, quantity: 1 },
                ],
                mode: 'subscription',
                metadata: {
                    'user_id': user_id,
                    'project_id': project_id,
                    'organization_id':organization_id,
                    'plan_id': plan.plan_id,
                    'app_id':input.app_id,
                    'plan_name':input.plan,
                    'subscription_benefits':JSON.stringify(plan),
                    'email':email,
                    'newCustomer':newCustomer
                  },
                allow_promotion_codes : true,
                currency: currency,
                subscription_data: {
                    metadata: {
                      'user_id': user_id,
                      'project_id': project_id,
                      'organization_id':organization_id,
                      'plan_id': plan.plan_id,
                      'app_id':input.app_id,
                      'plan_name':input.plan,
                      'subscription_benefits':JSON.stringify(plan),
                      'email':email,
                      'newCustomer':newCustomer
                    }
                  },
              });
            return res.status(200).send({type:"RXSUCCESS",message:"Payment session",data:session})

        } catch (error) {
            console.log(error);
        }
    }
    async getAllSubscription(req, res) {

        try {

            // const subscription = await stripe.invoices.retrieve(
            //     'in_1N3w9PSFnJmyrDL8V1hFuLVq'
            //   );
            const subscription = await stripe.invoices.retrieveUpcoming({
                customer: 'cus_NpcZRiFIWRPcdU',
            });
            // const subscription = await stripe.products.create({
            //     name: 'Elite Special',
            // });
            // const subscription = await stripe.subscriptions.retrieve(
            //     'sub_1Mrh10SFnJmyrDL8cbtZHF9f'
            //   );
            // const subscription = await stripe.charges.retrieve(
            //     'ch_3MrhTbSFnJmyrDL81XDTMA7g'
            //   );
            // const subscription = await stripe.plans.create({
            //     amount: 100,
            //     currency: 'INR',
            //     interval: 'month',
            //     product: 'prod_Ne02VyrsXPZNuy',
            //   });
                res.send(subscription)
        } catch (error) {
            console.log(error);
        }
        
    
    }

    async createEliteSubscription(req, res) {
        const input = req.body
        
        // validate the params
        let result = validateParameters(["plan","app_id","id","price","user_id","chatbot","webpages","document","queries"], input);

        if (result != 'valid') {
            let error = formatJoiError(result.errors);
            return res.status(400).send({
              type: "RXERROR",
              message: "Invalid params",
              errors: error
            });
        }
        let user_id = input.user_id;
        let app_plans = config('plan');
        let plans = app_plans.plans[input.app_id];
        const plan = plans[`${input.plan}`]
        if (!plan) {
            return res.status(400).send({
                type: "RXERROR",
                message: "plan must be chatbot_basic_monthly,chatbot_starter_monthly,chatbot_growth_monthly,chatbot_professional_monthly"
            });
        }

        plan["chatbot"] = input.chatbot
        plan["webpages"] = input.webpages
        plan["document"] = input.document
        plan["queries"] = input.queries

        let project_id
        let organization_id
        switch (plan.type) {
            case "organization":
                const organization = await OrganizationMember.findOne({
                    where : {
                        organization_id : input.id,
                        user_id : user_id,
                        role : "owner"
                    }
                })
                if(!organization){
                    return res.status(400).send({type:"RXERROR",message:"Invalid organization_id"})
                }
                organization_id = input.id
                project_id = null
                break;
            case "project":
                let data = await Project.findOne({
                    where : {
                        project_uid : input.id
                    }
                })
                if (!data) {
                    return res.status(400).send({type:"RXERROR",message:"Invalid project_uid"})
                }
                project_id = data.id,
                organization_id = data.organization_id

                break;
        
            default:
                break;
        }

        const user = await Subscription.findOne({
            where : {
                user_id : user_id,
            },
            order : [['id','DESC']]
        })

        let customer
        if (user) {
            if (user.status == "active" && user.organization_id == organization_id && user.app_id == input.app_id) {
                return res.status(400).send({
                    type:"RXERROR",
                    message:"You've already subscribed, but you have the option to upgrade",
                }) 
            }
            customer = user.customer_id
        }
        else{
            customer = []
        }

        let price = await stripe.prices.create({
            unit_amount: input.price,
            currency: 'usd',
            recurring: {interval: 'month'},
            product: 'prod_NpwsKH7QwZHxOB',
        });

        const stripe_plan_id = price.id

        const successUrl = paymentRedirectionUrl("success",plan,{})
        const cancelUrl = paymentRedirectionUrl("cancel",plan,{})

        const session = await stripe.checkout.sessions.create({
            success_url: successUrl,
            cancel_url: cancelUrl,
            // customer : customer,
            line_items: [
                { price: stripe_plan_id, quantity: 1 },
            ],
            mode: 'subscription',
            metadata: {
                'user_id': user_id,
                'project_id': project_id,
                'organization_id':organization_id,
                'plan_id': plan.plan_id,
                'app_id':input.app_id,
                'plan_name':input.plan,
                'subscription_benefits':JSON.stringify(plan)
                },
            allow_promotion_codes : true,
            subscription_data: {
                metadata: {
                    'user_id': user_id,
                    'project_id': project_id,
                    'organization_id':organization_id,
                    'plan_id': plan.plan_id,
                    'app_id':input.app_id,
                    'plan_name':input.plan,
                    'subscription_benefits':JSON.stringify(plan)
                }
                },
            });
        return res.status(200).send({type:"RXSUCCESS",message:"Payment session",data:session})
        
    }

    /**
     * 
     * @param {*} req 
     * @param {*} res 
     * @returns 
     * 
     * cancel subscription 
     */
    async cancelSubscription(req, res) {

    const input = req.body
    let user_id = req.authUser.User.id

    let result = validateParameters(["subscription_id"], input);

    if (result != 'valid') {
      let error = formatJoiError(result.errors);
      return res.status(400).send({
        type: "RXERROR",
        message: "Invalid params",
        errors: error
      });
    }

    const data = await Subscription.findOne({
        where : {
            id : input.subscription_id,
            user_id:user_id,
            status : {
                [Op.ne]: 'canceled'
            }
        }
    })

    if(!data) {
        return res.status(400).send({
            type: "RXERROR",
            message: "No Subscription found or invalid subscription_id",
        });
    }

    const subscription_id = data.subscription_id

    try {
        const deleted = await stripe.subscriptions.update(
            subscription_id,
            {
              cancel_at_period_end: true,
            }
          );
        return res.status(200).send({
            type : "RXSUCCESS",
            message:"Subscription cancel successfully",
            data : deleted
        })
    } catch (error) {
        console.log(error);
    }
        
    }

    async getSubscription(req, res) {
        const input = req.body
        let user_id = req.authUser.User.id

        let result = validateParameters(["project_uid"], input);
        if (result != 'valid') {
            let error = formatJoiError(result.errors);
            return res.status(400).send({
              type: "RXERROR",
              message: "Invalid params",
              errors: error
            });
          }

          const project = await getProjectId(input.project_uid)
          if (!project.data) {
              return res.send({
                  type : "RXERROR",
                  message :project.message
              })
          }

          const data = await Subscription.findOne({
            where : {
                project_id : project.data.id,
                user_id : user_id
            },
            order : [['created_at','DESC']]
          })

          if (!data) {
            return res.send({
                type : "RXERROR",
                message :"data not found"
            })
          }

          return res.send({
            type : "RXSUCCESS",
            message :"data fatch successfully",
            data : data
        })
    }

    async updateSubscription(req, res) {
        const input = req.body
        let user_id = req.authUser.user_id;
        
        // validate the params
        let result = validateParameters(["plan","app_id","id"], input);

        if (result != 'valid') {
            let error = formatJoiError(result.errors);
            return res.status(400).send({
              type: "RXERROR",
              message: "Invalid params",
              errors: error
            });
        }

        let app_plans = config('plan');
        let plans = app_plans.plans[input.app_id];

        if(plans==null || typeof plans=='undefined'){
            return res.status(400).send({type:"RXERROR",message:"Invalid plan or app_id"})
        }
        const plan = plans[`${input.plan}`]

        let project_id
            let organization_id
            switch (plan.type) {
                case "organization":
                    const organization = await OrganizationMember.findOne({
                        where : {
                            organization_id : input.id,
                            user_id : user_id,
                            role : "owner"
                        }
                    })
                    if(!organization){
                        return res.status(400).send({type:"RXERROR",message:"Invalid organization_id"})
                    }
                    organization_id = input.id
                    project_id = null
                    break;
                case "project":
                    let data = await Project.findOne({
                        where : {
                            project_uid : input.id
                        }
                    })
                    if (!data) {
                        return res.status(400).send({type:"RXERROR",message:"Invalid project_uid"})
                    }
                    project_id = data.id,
                    organization_id = data.organization_id

                    break;
            
                default:
                    break;
            }

        const subscriptionData = await Subscription.findOne({
            where :{
                app_id : input.app_id,
                project_id : project_id,
                organization_id : organization_id,
                user_id : user_id,
            },
            order : [['created_at','desc']]
        })

        if (!subscriptionData) {
            return res.status(400).send({
                type: "RXERROR",
                message: "subscription_id not found"
            });
        }

        let ip_address = req.headers["cf-connecting-ip"] || req.headers["x-forwarded-for"] || req.connection.remoteAddress;
        
        let ip_detail = await getIpDetail(ip_address)
        let currency;
        let country;
        if(typeof ip_detail === 'undefined' || ip_detail === null){
          country = 'US'
        } else {
          country = ip_detail.country
        } 

        let stripe_plan_id
        if(country=='IN'){
            currency = 'INR';
            stripe_plan_id = plan.inr_stripe_plan_id

        }else{
            currency = 'USD',
            stripe_plan_id = plan.stripe_plan_id
        }

        const proration_date = Math.floor(Date.now() / 1000);
        const subscription = await stripe.subscriptions.retrieve(subscriptionData.subscription_id);
        try {
            const result = await stripe.subscriptions.update(subscription.id, {
                // cancel_at_period_end: false,
                proration_behavior: 'create_prorations',
                metadata : {
                    plan_name : input.plan,
                    plan_id : plan.plan_id,
                    subscription_benefits : JSON.stringify(plan)
                },
                items: [{
                  id: subscription.items.data[0].id,
                  price: stripe_plan_id,
                }],
                proration_date: proration_date,
            });

            let project_id
            let organization_id
            if (subscriptionData.project_id && subscriptionData.organization_id) {
                project_id = subscriptionData.project_id,
                organization_id = subscriptionData.organization_id
            }
            if (!subscriptionData.project_id) {
                organization_id = subscriptionData.organization_id,
                project_id = null
            }
            
            await updateUsageLimitbyAppId(input.app_id,project_id,organization_id,result.metadata.subscription_benefits)
            await updateUsageDatabyAppId(input.app_id,project_id,organization_id,result.metadata.subscription_benefits)

            // const invoiceData = await stripe.invoices.retrieveUpcoming({
            //     customer: subscriptionData.customer_id,
            // });

            // const data = await Invoice.create({
            //     amount_due: invoiceData.amount_due,
            //     amount_paid: invoiceData.amount_paid,
            //     amount_remaining : invoiceData.amount_remaining,
            //     created:invoiceData.created,
            //     currency:invoiceData.currency,
            //     customer_id:invoiceData.customer,
            //     customer_email:invoiceData.customer_email,
            //     customer_name:invoiceData.customer_name,
            //     subscription_id:invoiceData.subscription,
            //     status:invoiceData.status,
            //     total:invoiceData.total,
            //     subtotal:invoiceData.subtotal,
            // })

            // const line_items = invoiceData.lines.data
            // await createInvoiceLineItems(line_items,data.id)
            return res.status(200).send({type:"RXSUCCESS",message:"Subscription Updated data",data:result})
        } catch (error) {
            console.log(error);
            return res.status(400).send({
                type: "RXERROR",
                message: "something went wrong"
            });
        }
        
    }

    async sendEmailTrailEndUser(req, res) {
        const input = req.body
  
        let days
        if (input.days) {
            days = input.days
        }else{
            days = 2
        }

        const data = await ProductTrial.findAll({
            include : [
                {
                    model : User,
                    as:"user"
                }
            ],
            where : {
                expiry_date : {
                    [Op.between]: [Sequelize.literal(`NOW() - INTERVAL ${days} day`),Sequelize.literal(`NOW()`)]
                },
                status : "trialing"
            }
        })

        const maildata = config('mail')
        // console.log(maildata);
        let transporter = nodemailer.createTransport(maildata);
        // send mail with defined transport object
        let htmlMessage = await loadEmailTemplate("inviteEmail.ejs", {
            name : "test"
        });
        // Update the 'to' field of the mail options
        // mailOptions.to = recipient;
        // Send the email and return a promise

        data.forEach(async (sendTo) => {
            const recipient = sendTo?.user?.email
            await transporter.sendMail({
                from:  '"YourGPT Chatbot" <chatbot@yourgpt.ai>',
                to: recipient,  // list of receivers
                subject: "subject", // Subject line | "Missed chat on tawk.to at Sunday, May 14, 2023, at 08:16 (GMT+0)"
                html: htmlMessage, // plain text body
            });
        })

        res.send(data)
    }

    async getTrailEndUser(req, res) {
        let month = 1

        const data = await ProductTrial.findAll({
            // include : [
            //     {
            //         model : User,
            //         as:"user"
            //     }
            // ],
            where : {
                expiry_date : {
                    [Op.between]: [Sequelize.literal(`NOW() - INTERVAL ${month} month`),Sequelize.literal(`NOW()`)]
                },
                status : "trialing"
            }
        })


        data.forEach(async (prductTrial) => {
            let customeWhere = {
                organization_id : prductTrial.organization_id,
                project_id : prductTrial.project_id,
                app_id : prductTrial.app_id
            }

            await UsageLimit.update({limit_value : 0},{
                where : customeWhere
            })

            await UsageData.update({usage_value : 0},{
                where : customeWhere
            })
        })

        res.send(data)
    }

    /**
     * 
     * @param {*} req 
     * @param {*} res 
     * @returns 
     * 
     * webhook url events define here
     */
    async subscriptionWebHook(req, res) {
        // console.log("subscriptionWebHook",req.body);
       
        try {
            console.log(req.body.type)
            switch (req.body.type) {
                case "customer.subscription.deleted":
                    console.log(req.body.type);
                    await subscriptionUpdate({status : req.body.data.object.status,canceled_at : req.body.data.object.canceled_at})
                    break;
                case "customer.subscription.created":
                    await subscriptionCreated(req.body.data.object)
                    break;
                case "customer.subscription.updated":
                    await subscriptionUpdate(req.body.data.object.id,{
                        status : req.body.data.object.status, 
                        plan_name : req.body.data.object.metadata.plan_name, 
                        plan_id : req.body.data.object.metadata.plan_id, 
                        subscription_benefits : req.body.data.object.metadata.subscription_benefits, 
                        stripe_plan_id : req.body.data.object.plan.id ,
                        created : req.body.data.object.created,
                        current_period_end : req.body.data.object.current_period_end,
                        current_period_start : req.body.data.object.current_period_start,
                        cancel_at_period_end:req.body.data.object.cancel_at_period_end
                    })
                    await getUpcomingInvoice({subscription : req.body.data.object.id , customer : req.body.data.object.customer},"customer.subscription.updated")
                    break;
                case "checkout.session.completed":
                    await getSubscriptionById(req.body.data.object.subscription)
                    break;
                case "invoice.paid":
                    console.log(req.body.data.object.lines.data[0]);
                    await getSubscriptionById(req.body.data.object.subscription)
                    await invoiceCreate(req.body.data.object)
                    if (req.body.data.object?.discount?.promotion_code) {
                        await discountSubscriptionCreate(req.body.data.object)
                    }
                    await usageLimit(req.body.data.object.subscription)
                    await usageData(req.body.data.object.subscription)
                    await getUpcomingInvoice(req.body.data.object)
                    const newCustomer = req.body.data.object.lines.data[0].metadata.newCustomer
                    if (newCustomer === true) {
                        await setThriveReferral(req.body.data.object.subscription)
                    }
                    const strdata = `New Subscription Paid: \`\`\`user_id = ${req.body.data.object.lines.data[0]?.metadata?.user_id} , total = ${req.body.data.object.total},subtotal = ${req.body.data.object.subtotal}, organization_id = ${req.body.data.object.lines.data[0]?.metadata?.organization_id},subscription_id  = ${req.body.data.object.subscription}\`\`\``
                    await notifyOnDiscord(strdata)
                    break;
                case "invoice.payment_failed":
                    await invoiceCreate(req.body.data.object)
                    break;
                case "charge.succeeded":
                    await chargeCreate(req.body.data.object)
                    break;
                case "charge.failed":
                    await chargeCreate(req.body.data.object)
                    break;
                case "charge.expired":
                    await chargeCreate(req.body.data.object)
                    break;
                case "charge.pending":
                    await chargeCreate(req.body.data.object)
                    break;
            
                default:
                    break;
            }
            return res.send()
        } catch (err) {
            console.log(err);
            return res.send(err);
        }

    }

    async getActivePlanDetail(req, res) {
        const input = req.body
        let user_id = req.authUser.user_id;
        
        // validate the params
        let result = validateParameters(["id","app_id","type"], input);

        if (result != 'valid') {
            let error = formatJoiError(result.errors);
            return res.status(400).send({
              type: "RXERROR",
              message: "Invalid params",
              errors: error
            });
        }
        let customWhere
        if (input.type == "project") {
            const data = await Project.findOne({
                where : {
                    project_uid : input.id
                }
            })
            if (!data) {
                return res.status(400).send({
                    type: "RXERROR",
                    message: "project not found",
                }); 
            }
            customWhere = {
                app_id : input.app_id,
                project_id : data.id
            }
        }else if (input.type == "organization") {
            customWhere = {
                app_id : input.app_id,
                organization_id : input.id
            }
            
        }else {
            return res.status(400).send({
                type: "RXERROR",
                message: "please send correct type input",
            });
        }

        try {
            let UsageLimitData = await UsageLimit.findAll({
                where : customWhere
            })
            let UsageDataData = await UsageData.findAll({
                where : customWhere
            });

            if(UsageLimitData.length<1){
                return res.status(400).send({
                    type: "RXERROR",
                    message: "data not found",
                }) 
            }
            customWhere["status"] = { [Op.in] : ["draft","paid"] } 
            let invoices = await Invoice.findAll({
                where : customWhere,
                order : [["created_at","desc"]]
            }) 
            let paid_invoice = invoices.filter((invoice) => {
                return invoice.status == "paid"
            })
            let next_billing_cycle = invoices.find((invoice) => {
                return invoice.status == "draft" && invoice.billing_reason == "upcoming"
            })

            let formattedData={}
            let plan_id=null;
            let organization_id=null;
            let project_id=null;
            let app_id=null;
            let plan_name=null;
            let status=null;
            UsageLimitData.forEach((limit)=>{
                let key=limit.limit_type;
                plan_id=limit.plan_id;
                organization_id=limit.organization_id;
                project_id=limit.project_id;
                app_id=limit.app_id;
                UsageDataData.forEach((usage)=>{
                    if(usage.usage_type==limit.limit_type){
                        formattedData[key]={
                            limit:limit.limit_value,
                            usage:usage.usage_value
                        }
                    }
                })
            })

            let current_plan = await Subscription.findOne({
                where : {
                    user_id : user_id,
                    status : {
                        [Op.in]:['active','canceled','paused']
                    },
                    plan_id : plan_id,
                    organization_id : organization_id,
                    project_id : project_id,
                    app_id : app_id
                },
                order :[["id","desc"]]
            })

            let trailPlan = await ProductTrial.findOne({
                where : {
                    user_id : user_id,
                    plan_id : plan_id,
                    organization_id : organization_id,
                    project_id : project_id,
                    app_id : app_id
                }
            })

            if (!current_plan) {
                const plan = config('plan')["plans"][`${app_id}`]
                const data = Object.keys(plan).find((data) => {
                    let config_plan_id = plan[`${data}`].plan_id
                    return config_plan_id == plan_id
                })
                plan_name = data
            }else{
                plan_name = current_plan.plan_name
            }
            let data={
                usage:formattedData,
                plan : plan_name,
                trail_plan:trailPlan,
                plan_id : plan_id,
                next_billing_cycle : next_billing_cycle,
                paid_invoice: paid_invoice,
                status:status
            }

            if(trailPlan){
                data.status = trailPlan.status;
                data.trail_plan = trailPlan
            }

            if(current_plan){
                data.status = current_plan.status;
            }


            // let subscription_benefits = JSON.parse(current_plan.subscription_benefits)

            return res.send({
                type: "RXSUCCESS",
                message: "usage data",
                data : data
            })

        } catch (error) {
            console.log(error);
            return res.send({
                type: "RXERROR",
                message: "Something went wrong",
            })
        }
    }

}

async function subscriptionCreated(object) {
    const plan_id = object.plan.id
    const data = await Subscription.findOrCreate({
            where : {subscription_id: object.id},
            defaults :{
            status : object.status,
            subscription_id:object.id,
            created:object.created,
            currency:object.currency,
            current_period_end:object.current_period_end,
            current_period_start:object.current_period_start,
            customer_id:object.customer,
            status:object.status,
            user_id : object.metadata.user_id,
            collection_method:object.collection_method,
            plan_id : object.metadata.plan_id,
            project_id:object.metadata.project_id,
            app_id:object.metadata?.app_id,
            organization_id:object.metadata?.organization_id,
            plan_name : object.metadata?.plan_name,
            subscription_benefits : object.metadata?.subscription_benefits,
            stripe_plan_id:plan_id,
        }})
    return data
}

async function getSubscriptionById(object) {
    
      const data = await Subscription.findOne({
        where:{
            subscription_id : object
        }
      })

      if (data) {
        return await Subscription.update({status : "active"},{
            where : {
                subscription_id : object
            }
        })
      }

      const subscription = await stripe.subscriptions.retrieve(
        object
      );

    await Subscription.findOrCreate({
        where: { subscription_id: object},
        defaults: {
            subscription_id:subscription.id,
            created:subscription.created,
            currency:subscription.currency,
            current_period_end:subscription.current_period_end,
            current_period_start:subscription.current_period_start,
            customer_id:subscription.customer,
            status:subscription.status,
            user_id : subscription.metadata.user_id,
            collection_method:subscription.collection_method,
            plan_id : subscription.metadata.plan_id,
            user_id:subscription.metadata.user_id,
            project_id:subscription.metadata.project_id,
            app_id:subscription.metadata?.app_id,
            organization_id:subscription.metadata?.organization_id,
            plan_name : subscription.metadata?.plan_name,
            subscription_benefits : subscription.metadata?.subscription_benefits,
            stripe_plan_id:subscription.plan.id
        }
    })
}

async function subscriptionUpdate(subscription_id,object) {
    const data = await Subscription.update(object,{
        where : {subscription_id : subscription_id}
    })
    
    return data
}

async function invoiceCreate(object) {
    const subscription = await Subscription.findOne({
        where : {
            subscription_id : object.subscription
        }
    })
    const subscription_id = subscription?.id
    const data = await Invoice.create(
        {
            status : object.status,
            invoice_id:object.id,
            amount_due:object.amount_due,
            amount_paid:object.amount_paid,
            amount_remaining:object.amount_remaining,
            created:object.created,
            currency:object.currency,
            customer_id:object.customer,
            transaction_id:object.charge,
            customer_email:object.customer_email,
            customer_name:object.customer_name,
            product_id:object.product_id,
            plan_id:object.plan_id,
            subscription_id:subscription_id,
            payment_intent:object.payment_intent,
            total:object.total,
            subtotal:object.subtotal,
            invoice_pdf : object.invoice_pdf,
            app_id : object.lines.data[0].metadata?.app_id,
            organization_id: object.lines.data[0].metadata?.organization_id,
            due_date : object.due_date,
            paid : object.paid,
            period_end : object.period_end,
            period_start : object.period_start,
            billing_reason : object.billing_reason,
        })
    
    return data
}

async function chargeCreate(object) {
    const invoice_id = object.invoice
    const invoice = await stripe.invoices.retrieve(
        invoice_id
    )
    const subscription_id = invoice.subscription
    const subscription = await Subscription.findOne({
        where : {
            subscription_id : subscription_id
        }
    })
    
    const data = await Transaction.create(
        {
            status : object.status,
            transaction_id:object.id,
            amount:object.amount,
            created : object.created,
            amount_captured:object.amount_captured,
            amount_refunded:object.amount_refunded,
            currency:object.currency,
            subscription_id:subscription.id
        })
    return 0
}

async function discountSubscriptionCreate(object) {

    const subscription = await Subscription.findOne({
        where : {
            subscription_id : object.subscription
        }
    })
    const subscription_id = subscription.id
    const invoice = await Invoice.findOne({
        where : {
            invoice_id : object.id,
            status : "paid"
        }
    })
    const invoice_id = invoice.id;
    const data = await DiscountSubscription.create(
        {
            subscription_id : subscription_id,
            coupon_id : object.discount.coupon.id,
            percent_off : object.discount.coupon.percent_off, 
            promotion_code:object.discount.promotion_code,
            invoice_id : invoice_id
        })
    return data
}

async function usageLimit(subscription_id){
    let data1 = await Subscription.findOne({
        include : [
            {model : User}
        ],
        where : {
            status : "active",
            subscription_id : subscription_id
        }
    })
    let plan_benefits = data1?.subscription_benefits
    let project_id = data1?.project_id;
    let organization_id = data1.organization_id;
    let app_id = data1.app_id;
    let plan_id = data1.plan_id

    let customWhere
    if (project_id) {
        customWhere = {
            project_id:project_id,
            app_id:app_id
        }
    }else if(organization_id) {
        customWhere = {
            organization_id:organization_id,
            app_id:app_id
        }
    }
    const usage = await UsageLimit.findAll({
        where : customWhere
    })
    const plan = config('plan')["plans"][`${app_id}`]
    const plan_name = Object.keys(plan).find((data) => {
        let config_plan_id = plan[`${data}`].plan_id
        return config_plan_id == plan_id
    })
    const searchBy = data1?.User?.email

    const updateChatBotCount = await updateBrevoContact({chatbot_plan:`${plan_name}`},searchBy)
    if (usage.length > 0) {
        return updateUsageLimitbyAppId(app_id,project_id,organization_id,plan_benefits)
    }

    return usageLimitbyAppId(app_id,project_id,organization_id,plan_benefits)
}

async function usageData(subscription_id){
    let data1 = await Subscription.findOne({
        where : {
            status : "active",
            subscription_id : subscription_id
        }
    })
    let plan_benefits = data1?.subscription_benefits
    let project_id = data1?.project_id;
    let organization_id = data1?.organization_id;
    let app_id = data1.app_id;
    if (project_id) {
        customWhere = {
            project_id:project_id,
            app_id:app_id
        }
    }else if(organization_id) {
        customWhere = {
            organization_id:organization_id,
            app_id:app_id
        }
    }
    const usage = await UsageData.findAll({
        where : customWhere
    })

    if (usage.length > 0) {
        return updateUsageDatabyAppId(app_id,project_id,organization_id,plan_benefits)
    }
    return  usageDatabyAppId(app_id,project_id,organization_id,plan_benefits)
}


function usageLimitbyAppId(app_id,project_id,organization_id,plan_benefits) {
    console.log("usageLimitbyAppId",{app_id,project_id,organization_id,plan_benefits});
        const benefits = JSON.parse(plan_benefits)
        const plan_id = benefits.plan_id
        const features = benefits.features
        Object.keys(benefits).forEach(async (i)=>{
            if(features.includes(i)){
               await UsageLimit.create({
                   plan_id : plan_id,
                   app_id:app_id,
                   project_id:project_id,
                   organization_id:organization_id,
                   limit_type : i,
                   limit_value : benefits[i]
               })
            }
        })
}

function usageDatabyAppId(app_id,project_id,organization_id,plan_benefits) {
    console.log("usageDatabyAppId",{app_id,project_id,organization_id,plan_benefits});
    const benefits = JSON.parse(plan_benefits)
    const plan_id = benefits.plan_id
    const features = benefits.features
        Object.keys(benefits).forEach(async (i)=>{
            if(features.includes(i)){
               await UsageData.create({
                   plan_id : plan_id,
                   app_id:app_id,
                   project_id:project_id,
                   organization_id:organization_id,
                   usage_type : i,
                   usage_value : 0
               })
            }
        })
}

function updateUsageDatabyAppId(app_id,project_id,organization_id,plan_benefits) {
    console.log("updateUsageDatabyAppId",{app_id,project_id,organization_id,plan_benefits});
    const benefits = JSON.parse(plan_benefits)
    const plan_id = benefits.plan_id
    const features = benefits.features
    Object.keys(benefits).forEach(async (i)=>{
        if(features.includes(i)){
            if (i == "queries") {
                await UsageData.update({plan_id : plan_id,usage_value : 0},{
                    where : {
                        usage_type : i,
                        app_id:app_id,
                        project_id:project_id,
                        organization_id:organization_id,
                    }
                })
            }
            await UsageData.update({plan_id : plan_id},{
                where : {
                    usage_type : i,
                    app_id:app_id,
                    project_id:project_id,
                    organization_id:organization_id,
                }
            })
        }
    })
}

async function updateUsageLimitbyAppId(app_id,project_id,organization_id,plan_benefits) {
    console.log("updateUsageLimitbyAppId",{app_id,project_id,organization_id,plan_benefits});
    await ProductTrial.update({status : "upgraded"},{
        where : {
            app_id:app_id,
            project_id:project_id,
            organization_id:organization_id,
        }
    })
    const benefits = JSON.parse(plan_benefits)
    const plan_id = benefits.plan_id
    const features = benefits.features
    Object.keys(benefits).forEach(async (i)=>{
        if(features.includes(i)){
           await UsageLimit.update({plan_id : plan_id,limit_value : benefits[i]},{
                where : {
                    limit_type : i,
                    app_id:app_id,
                    project_id:project_id,
                    organization_id:organization_id,
                }
           })
        }
    })
}

function paymentRedirectionUrl(type,plan,data) {
    let url=""
    if(type=="success"){
        url = plan.successUrl
    }else{
        url = plan.cancelUrl
    }

    Object.keys(data).forEach(function(key){
        let formatUrl=url.replace("@"+key,data[key])
        url=formatUrl;
    })
    return url
}

async function createInvoiceLineItems(data,invoice_id) {
    
    data.forEach(async (item) => {
        const subscription = await Subscription.findOne({
            where : {
                subscription_id : item.subscription
            }
        })
        await InvoiceLineItem.create({
            invoice_id: invoice_id,
            amount : item.amount,
            amount_excluding_tax:item.amount_excluding_tax,
            currency:item.currency,
            description:item.description,
            period_end:item.period.end,
            period_start:item.period.start,
            subscription_id:subscription.id,
        })
    })
}

async function getUpcomingInvoice(object,type) {

    const subscription = await Subscription.findOne({
        where : {
            subscription_id : object.subscription
        }
    })

    const invoice = await stripe.invoices.retrieveUpcoming({
        customer: object.customer,
        subscription : object.subscription
    });
    if(typeof invoice.amount_due=="undefined"){
        return 0
    }

    const data = await Invoice.findOne({
        where : {
            subscription_id : subscription.id,
            status : "draft",
        },
    })

    if (data) {
        await Invoice.update({
            amount_due: invoice.amount_due,
            amount_paid:invoice.amount_paid,
            amount_remaining : invoice.amount_remaining,
            created:invoice.created,
            period_start : invoice.period_start,
            period_end : invoice.period_end,
            billing_reason : invoice.billing_reason,
            currency:invoice.currency,
            total:invoice.total,
            subtotal:invoice.subtotal,
            paid : invoice.paid,
            app_id:subscription.app_id,
            organization_id:subscription.organization_id,
        },{
            where : {
                subscription_id : `${subscription.id}`,
                status : "draft",
            }
        })
        return 0
    }
    await Invoice.create({
        amount_due: invoice.amount_due,
        amount_paid:invoice.amount_paid,
        amount_remaining : invoice.amount_remaining,
        created:invoice.created,
        period_start : invoice.period_start,
        period_end : invoice.period_end,
        billing_reason : invoice.billing_reason,
        currency:invoice.currency,
        customer_id:invoice.customer,
        transaction_id:invoice.charge,
        customer_email:invoice.customer_email,
        customer_name:invoice.customer_name,
        subscription_id:subscription.id,
        status:invoice.status,
        payment_intent:invoice.payment_intent,
        total:invoice.total,
        subtotal:invoice.subtotal,
        invoice_pdf:invoice.invoice_pdf,
        app_id:subscription.app_id,
        organization_id:subscription.organization_id,
        due_date : invoice.due_date,
        paid : invoice.paid,
    })

    return 0
}


async function setThriveReferral(object) {

    const SubscriptionData = await Subscription.findOne({
        include : [
            {
                model : User
            },
            {
                model : Invoice,
                where : {
                    status : "paid"
                }
            }
        ],
        where : {
            subscription_id : object
        }
    })

    let key = `${SubscriptionData.organization_id}`; // Project key
    let email_id = SubscriptionData.User.email  // email address of the member.
    let user_id = SubscriptionData.user_id
    let customer_id = SubscriptionData.customer_id
    let digestRaw = email_id+customer_id
    let algorithm = "sha256"
    let digest = crypto.createHmac(algorithm, key).update(digestRaw).digest("hex")

    const { refresh_token,client_id,client_secret,grant_type } = config("zoho")
    const settingData = await Setting.findOne({
        where : {
            key : "thrive"
        }
    })

    let { expires_in , access_token } = JSON.parse(settingData.value)
    const expired = expires_in <= moment().format("YYYY-MM-DD HH:mm:ss")

    if (expired) {
        fetch(`https://accounts.zoho.in/oauth/v2/token?refresh_token=${refresh_token}&client_id=${client_id}&client_secret=${client_secret}&grant_type=${grant_type}`,{
        method : "POST",
        // headers : {
        //     'Content-Type' : 'application/json'
        // }
        }).then(response => {
            if (!response.ok) {
                console.log('status1:', response.status);
                console.log('statusText1:', response.statusText);
                console.log('user_id:', user_id);
            }
            return response.json();
        })
        .then(async(data )=> {
            console.log('Response1:', data);
            access_token = data.access_token
            const expires_in = moment().add(30, "minutes").format("YYYY-MM-DD HH:mm:ss")
            const value = JSON.stringify({"access_token":access_token,"expires_in" :expires_in})
            await Setting.update({value : value},{
                where : {
                    key : "thrive"
                }
            })
        })
        .catch(error => {
            console.error('Error1 occurred:', error);
            console.log('user_id:', user_id);
        });
    }
    

    let widget_code = "63af017b75ef5db4c4e5167777e84f206fe0e07a6b96f964d73e390a898cde9c"
    const  thrive_digest = digest
    const body = JSON.stringify({
        "email": email_id,
        "zt_customer_id": SubscriptionData.user_id,
        "thrive_digest" : thrive_digest,
        "amount": SubscriptionData.Invoices.amount_paid,
        "order_id": SubscriptionData.id
    })

    fetch(`https://thrive.zoho.com/thrive-publicapi/widget/${widget_code}/purchase`,{
        method : "POST",
        headers : {
            'Authorization': `${access_token}`,
            'Content-Type' : 'application/json'
        },
        body : body
    }).then(response => {
        if (!response.ok) {
            console.log('status:', response.status);
            console.log('statusText:', response.statusText);
            console.log('user_id:', user_id);
        }
        return response.text();
    })
    .then(async(data )=> {
    console.log('Response:', data);
    
    })
    .catch(error => {
    console.error('Error occurred:', error);
    console.log('user_id:', user_id);
    });
}