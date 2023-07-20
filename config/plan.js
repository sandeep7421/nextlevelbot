payment_test_mode = env("PAYMENT_TEST_MODE","");

if(payment_test_mode===true){
   module.exports = {
      plans:{
         1:{
            chatbot_basic_monthly:{
               plan_id : 1,
               stripe_plan_id:"",
               inr_stripe_plan_id:"",
               successUrl:"",
               cancelUrl : "",
               type : "organization",
               features:["chatbot","document","credits","characters"],
               chatbot : 5,
               document: 1,
               credits : 100,
               characters : 5000,
               isFree:true
            },
            chatbot_starter_monthly:{
               plan_id : 2,
               stripe_plan_id:"price_1MsiQfSFnJmyrDL86CNgNgZO",
               inr_stripe_plan_id:"price_1MzES8SFnJmyrDL8N5Elff4E",
               successUrl:"https://chatbot.yourgpt.ai/payment-success",
               cancelUrl : "https://chatbot.yourgpt.ai/payment-error",
               type : "organization",
               features:["chatbot","document","credits","characters"],
               chatbot : 1,
               document: 20,
               credits : 2000,
               characters: 1000000, //1 Million
               is_trial:true
            },
            chatbot_essential_monthly:{
               plan_id:3,
               stripe_plan_id:"price_1ND0fASFnJmyrDL8lZM6OINv",
               inr_stripe_plan_id:"price_1ND0fBSFnJmyrDL8inXmnpBG",
               successUrl:"https://chatbot.yourgpt.ai/payment-success",
               cancelUrl : "https://chatbot.yourgpt.ai/payment-error",
               type : "organization",
               features:["chatbot","document","credits","characters"],
               chatbot : 5,
               document: 50,
               credits : 5000,
               characters: 5000000, // 5 Million
           },
           chatbot_professional_monthly:{
              plan_id:4,
              stripe_plan_id:"price_1N28lSSFnJmyrDL836Njp6Dm",
              inr_stripe_plan_id:"price_1ND2xtSFnJmyrDL8tojCcf4V",
              successUrl:"https://chatbot.yourgpt.ai/payment-success",
              cancelUrl : "https://chatbot.yourgpt.ai/payment-error",
              type : "organization",
              features:["chatbot","document","credits","characters"],
              chatbot : 10,
              document: 200,
              credits : 10000,
              characters: 10000000, //10 Million
           },
            chatbot_elite_monthly:{
               plan_id:5,
               stripe_plan_id:"price_1NE6sFSFnJmyrDL80ckGE6hJ",
               inr_stripe_plan_id:"price_1NE6suSFnJmyrDL89X4wVy7h",
               successUrl:"https://chatbot.yourgpt.ai/payment-success",
               cancelUrl : "https://chatbot.yourgpt.ai/payment-error",
               type : "organization",
               features:["chatbot","document","credits","characters"],
               chatbot : 100000000,
               document: 1000,
               credits : 50000,
               characters : 100000000 // 100 Million
            },
            chatbot_eliteNew_monthly:{
               plan_id:6,
               stripe_plan_id:"",
               inr_stripe_plan_id:"",
               successUrl:"https://chatbot.yourgpt.ai/payment-success",
               cancelUrl : "https://chatbot.yourgpt.ai/payment-error",
               type : "organization",
               features:["chatbot","document","credits","characters"],
               chatbot : 0,
               document: 0,
               credits : 0,
               characters: 0,
            }
         },
         2:{
            qa_starter_monthly:{
               plan_id : 7,
               stripe_plan_id:"price_1ND2mtSFnJmyrDL8mfIbQYH6",
               inr_stripe_plan_id:"price_1ND2mSSFnJmyrDL87J8ujfEA",
               successUrl:"https://qaexpert.yourgpt.ai/payment-success",
               cancelUrl : "https://qaexpert.yourgpt.ai/payment-error",
               type : "organization",
               features:["workspace","document","credits","characters"],
               workspace : 1,
               document : 10,
               credits : 500,
               characters: 1000000, //1 Million
               is_trial:true
            },
            qa_essential_monthly:{
               plan_id : 8,
               stripe_plan_id:"price_1ND0q9SFnJmyrDL8ivvX0vaP",
               inr_stripe_plan_id:"price_1ND0q9SFnJmyrDL8eOft2ZMe",
               successUrl:"https://qaexpert.yourgpt.ai/payment-success",
               cancelUrl : "https://qaexpert.yourgpt.ai/payment-error",
               type : "organization",
               features:["workspace","document","credits","characters"],
               workspace : 3,
               document : 20,
               credits : 3000,
               characters: 3000000,//3 Million
            },
            qa_professional_monthly:{
               plan_id:9,
               stripe_plan_id:"price_1ND2nnSFnJmyrDL8H5fZOOQd",
               inr_stripe_plan_id:"price_1ND2o0SFnJmyrDL8VWj3bCdU",
               successUrl:"https://qaexpert.yourgpt.ai/payment-success",
               cancelUrl : "https://qaexpert.yourgpt.ai/payment-error",
               type : "organization",
               features:["workspace","document","credits","characters"],
               workspace : 10,
               document : 150,
               credits:10000,
               characters: 10000000, //10 Million
            },
            qa_elite_monthly:{
               plan_id:10,
               stripe_plan_id:"price_1NBbusSFnJmyrDL8jjtYyJSH",
               inr_stripe_plan_id:"price_1NBcPGSFnJmyrDL8JKnUfOps",
               successUrl:"https://qaexpert.yourgpt.ai/payment-success",
               cancelUrl : "https://qaexpert.yourgpt.ai/payment-error",
               type : "organization",
               features:["workspace","document","credits","characters"],
               workspace : 100000,
               document : 500,
               credits : 50000,
               characters: 100000000, //100 Million
            }
         },
         3:{
            basic_monthly:{
               plan_id : 1,
               stripe_plan_id:'price_1MsiQfSFnJmyrDL86CNgNgZO',
               inr_stripe_plan_id:"price_1MzES8SFnJmyrDL8N5Elff4E",
               features:["chatbot","webpages","document"],
               successUrl:"https://chatbot.yourgpt.ai/payment-success",
               cancelUrl : "https://chatbot.yourgpt.ai/payment-error",
               type : "project",
               chatbot : 10,
               webpages : 20,
               document: 60,
            },
            standard_monthly:{
               plan_id : 2,
               stripe_plan_id:'price_1MsiO5SFnJmyrDL8AfTIPyl1',
               inr_stripe_plan_id:"price_1MzETGSFnJmyrDL8e7AbYMeS",
               features:["chatbot","webpages","document"],
               successUrl:"https://chatbot.yourgpt.ai/payment-success",
               cancelUrl : "https://chatbot.yourgpt.ai/payment-error",
               type : "project",
               chatbot : 10,
               webpages : 20,
               document: 60,
            },
           growth_monthly:{
            plan_id:3,
            stripe_plan_id:"price_1MwfmmSFnJmyrDL83cjjAgEF",
            inr_stripe_plan_id:"price_1MzDJHSFnJmyrDL8WgDwIn4V",
            features:["chatbot","webpages","document"],
            successUrl:"https://chatbot.yourgpt.ai/payment-success",
            cancelUrl : "https://chatbot.yourgpt.ai/payment-error",
            type : "project",
            chatbot : 3,
            webpages : 1,
            document: 3,
           },
           professional_monthly:{
              plan_id:4,
              stripe_plan_id:"",
              inr_stripe_plan_id:"",
              features:["chatbot","webpages","document"],
              successUrl:"https://chatbot.yourgpt.ai/payment-success",
              cancelUrl : "https://chatbot.yourgpt.ai/payment-error",
              type : "project",
              chatbot : 4,
              webpages : 3,
              document: 4,
           },
           elite_monthly:{
              plan_id:5,
              stripe_plan_id:"",
              inr_stripe_plan_id:"",
              features:["chatbot","webpages","document"],
              successUrl:"https://chatbot.yourgpt.ai/payment-success",
               cancelUrl : "https://chatbot.yourgpt.ai/payment-error",
              type : "project",
              chatbot : 5,
              webpages : 3,
              document: 5,
           }
         },
         4:{
            basic:{
               document_limit:1,
               query_limit:2
               },
               standard_monthly:{
               plan_id:'price_1MsiQfSFnJmyrDL86CNgNgZO',
               document_limit:2,
               query_limit:2,
               inr_plan_id:"price_1MzES8SFnJmyrDL8N5Elff4E",
               },
               growth_monthly:{
               plan_id:'price_1MsiO5SFnJmyrDL8AfTIPyl1',
               document_limit:2,
               query_limit:3,
               inr_plan_id:"price_1MzETGSFnJmyrDL8e7AbYMeS",
               },
               professional_monthly:{
                  plan_id:"price_1MwfmmSFnJmyrDL83cjjAgEF",
                  document_limit:300000,
                  query_limit:400000,
                  inr_plan_id:"price_1MzDJHSFnJmyrDL8WgDwIn4V",
               },
               elite_monthly:{
                  plan_id:"",
                  document_limit:4,
                  query_limit:5
               }
         },
         5:{
            basic:{
               document_limit:1,
               query_limit:2
               },
               standard_monthly:{
               plan_id:'price_1MsiQfSFnJmyrDL86CNgNgZO',
               document_limit:2,
               query_limit:2,
               inr_plan_id:"price_1MzES8SFnJmyrDL8N5Elff4E",
               },
               growth_monthly:{
               plan_id:'price_1MsiO5SFnJmyrDL8AfTIPyl1',
               document_limit:2,
               query_limit:3,
               inr_plan_id:"price_1MzETGSFnJmyrDL8e7AbYMeS",
               },
               professional_monthly:{
                  plan_id:"price_1MwfmmSFnJmyrDL83cjjAgEF",
                  document_limit:300000,
                  query_limit:400000,
                  inr_plan_id:"price_1MzDJHSFnJmyrDL8WgDwIn4V",
               },
               elite_monthly:{
                  plan_id:"",
                  document_limit:4,
                  query_limit:5
               }
         },
         6:{
            basic:{
               document_limit:1,
               query_limit:2
               },
               standard_monthly:{
               plan_id:'price_1MsiQfSFnJmyrDL86CNgNgZO',
               document_limit:2,
               query_limit:2,
               inr_plan_id:"price_1MzES8SFnJmyrDL8N5Elff4E",
               },
               growth_monthly:{
               plan_id:'price_1MsiO5SFnJmyrDL8AfTIPyl1',
               document_limit:2,
               query_limit:3,
               inr_plan_id:"price_1MzETGSFnJmyrDL8e7AbYMeS",
               },
               professional_monthly:{
                  plan_id:"price_1MwfmmSFnJmyrDL83cjjAgEF",
                  document_limit:300000,
                  query_limit:400000,
                  inr_plan_id:"price_1MzDJHSFnJmyrDL8WgDwIn4V",
               },
               elite_monthly:{
                  plan_id:"",
                  document_limit:4,
                  query_limit:5
               }
         }
      }
   }

}else{
   module.exports = {
      plans:{
         1:{
            chatbot_basic_monthly:{
               plan_id : 1,
               stripe_plan_id:'',
               inr_stripe_plan_id:"",
               type : "organization",
               successUrl:"https://chatbot.yourgpt.ai/payment-success",
               cancelUrl : "https://chatbot.yourgpt.ai/payment-error",
               features:["chatbot","document","credits","characters"],
               chatbot : 5,
               document: 1,
               credits : 100,
               characters : 5000,
               isFree:true
            },
            chatbot_starter_monthly:{
               plan_id : 2,
               stripe_plan_id:'price_1Mqy5CSFnJmyrDL8BGMJPMFP',
               inr_stripe_plan_id:"price_1MzEVcSFnJmyrDL8x5veZxHm",
               type : "organization",
               successUrl:"https://chatbot.yourgpt.ai/payment-success",
               cancelUrl : "https://chatbot.yourgpt.ai/payment-error",
               features:["chatbot","document","credits","characters"],
               chatbot : 1,
               document: 20,
               credits : 2000,
               characters: 1000000, //1 Million
               is_trial : true
            },
            chatbot_essential_monthly:{
               plan_id : 3,
               stripe_plan_id:'price_1ND0fhSFnJmyrDL8TGaS0nH5',
               inr_stripe_plan_id:"price_1ND0fhSFnJmyrDL8EfLFVNwl",
               successUrl:"https://chatbot.yourgpt.ai/payment-success",
               cancelUrl : "https://chatbot.yourgpt.ai/payment-error",
               type : "organization",
               features:["chatbot","document","credits","characters"],
               chatbot : 5,
               document: 50,
               credits : 5000,
               characters: 5000000, // 5 Million
            },
            chatbot_professional_monthly:{
               plan_id : 4,
               stripe_plan_id:'price_1N27OjSFnJmyrDL82uhGJ9AJ',
               inr_stripe_plan_id:"price_1ND2tdSFnJmyrDL8VH4FStuM",
               successUrl:"https://chatbot.yourgpt.ai/payment-success",
               cancelUrl : "https://chatbot.yourgpt.ai/payment-error",
               type : "organization",
               features:["chatbot","document","credits","characters"],
              chatbot : 10,
              document: 200,
              credits : 10000,
              characters: 10000000, //10 Million
            },
            chatbot_elite_monthly:{
               plan_id:6,
               stripe_plan_id:"price_1NE71gSFnJmyrDL8hwiNdjlo",
               inr_stripe_plan_id:"price_1NE71xSFnJmyrDL8UWMvRlnf",
               successUrl:"https://chatbot.yourgpt.ai/payment-success",
               cancelUrl : "https://chatbot.yourgpt.ai/payment-error",
               type : "organization",
               features:["chatbot","document","credits","characters"],
               chatbot : 100000000,
               document: 1000,
               credits : 50000,
               characters : 100000000 // 100 Million
            },
            chatbot_eliteNew_monthly:{
               plan_id:5,
               stripe_plan_id:"",
               inr_stripe_plan_id:"",
               successUrl:"https://chatbot.yourgpt.ai/payment-success",
               cancelUrl : "https://chatbot.yourgpt.ai/payment-error",
               type : "organization",
               features:["chatbot","document","credits","characters"],
               chatbot : 0,
               document: 0,
               credits : 0,
               characters : 0
            }
         },
         2:{
            qa_starter_monthly:{
               plan_id : 7,
               stripe_plan_id:"price_1ND2LUSFnJmyrDL8IRZPx01U",
               inr_stripe_plan_id:"price_1ND2LjSFnJmyrDL8UywvPVoO",
               successUrl:"https://qaexpert.yourgpt.ai/payment-success",
               cancelUrl : "https://qaexpert.yourgpt.ai/payment-error",
               type : "organization",
               features:["workspace","document","credits","characters"],
               workspace : 1,
               document : 10,
               credits : 500,
               characters: 1000000, //1 Million
               is_trial:true
            },
            qa_essential_monthly:{
               plan_id : 8,
               stripe_plan_id:"price_1ND0qsSFnJmyrDL8dDhw7asF",
               inr_stripe_plan_id:"price_1ND0qsSFnJmyrDL8thrzymHa",
               successUrl:"https://qaexpert.yourgpt.ai/payment-success",
               cancelUrl : "https://qaexpert.yourgpt.ai/payment-error",
               type : "organization",
               features:["workspace","document","credits","characters"],
               workspace : 3,
               document : 20,
               credits : 3000,
               characters: 3000000,//3 Million
            },
            qa_professional_monthly:{
               plan_id:9,
               stripe_plan_id:"price_1ND2ISSFnJmyrDL8oyMMsdXi",
               inr_stripe_plan_id:"price_1ND2JiSFnJmyrDL8HRna6KjB",
               successUrl:"https://qaexpert.yourgpt.ai/payment-success",
               cancelUrl : "https://qaexpert.yourgpt.ai/payment-error",
               type : "organization",
               features:["workspace","document","credits","characters"],
               workspace : 10,
               document : 150,
               credits:10000,
               characters: 10000000, //10 Million
            },
            qa_elite_monthly:{
               plan_id:10,
               stripe_plan_id:"price_1NBbvUSFnJmyrDL8uZxsvZjr",
               inr_stripe_plan_id:"price_1NBcZlSFnJmyrDL8GlNySHNG",
               successUrl:"https://qaexpert.yourgpt.ai/payment-success",
               cancelUrl : "https://qaexpert.yourgpt.ai/payment-error",
               type : "organization",
               features:["workspace","document","credits","characters"],
               workspace : 100000,
               document : 500,
               credits : 50000,
               characters: 100000000, //100 Million
            }
         },
         3:{
            basic:{
               document_limit:10,
               query_limit:1000
              },
              standard_monthly:{
               plan_id:"price_1MsiQfSFnJmyrDL86CNgNgZO",
               document_limit:50,
               query_limit:10000,
               inr_plan_id:"price_1MzEVcSFnJmyrDL8x5veZxHm",
              },
              growth_monthly:{
               plan_id:"price_1MsiO5SFnJmyrDL8AfTIPyl1",
               document_limit:250,
               query_limit:50000,
               inr_plan_id:"price_1MzEWFSFnJmyrDL8sGi2XGq2",
              },
              professional_monthly:{
                 plan_id:"price_1MwfmmSFnJmyrDL83cjjAgEF",
                 document_limit:500,
                 query_limit:100000,
                 inr_plan_id:"price_1MzEXMSFnJmyrDL8hPlv7l9U",
              },
              elite_monthly:{
                 plan_id:"",
                 document_limit:20000,
                 query_limit:200000
              }
         },
         4:{
            basic:{
               document_limit:10,
               query_limit:1000
              },
              standard_monthly:{
               plan_id:"price_1MsiQfSFnJmyrDL86CNgNgZO",
               document_limit:50,
               query_limit:10000,
               inr_plan_id:"price_1MzEVcSFnJmyrDL8x5veZxHm",
              },
              growth_monthly:{
               plan_id:"price_1MsiO5SFnJmyrDL8AfTIPyl1",
               document_limit:250,
               query_limit:50000,
               inr_plan_id:"price_1MzEWFSFnJmyrDL8sGi2XGq2",
              },
              professional_monthly:{
                 plan_id:"price_1MwfmmSFnJmyrDL83cjjAgEF",
                 document_limit:500,
                 query_limit:100000,
                 inr_plan_id:"price_1MzEXMSFnJmyrDL8hPlv7l9U",
              },
              elite_monthly:{
                 plan_id:"",
                 document_limit:20000,
                 query_limit:200000
              }
         },
         5:{
            basic:{
               document_limit:10,
               query_limit:1000
              },
              standard_monthly:{
               plan_id:"price_1MsiQfSFnJmyrDL86CNgNgZO",
               document_limit:50,
               query_limit:10000,
               inr_plan_id:"price_1MzEVcSFnJmyrDL8x5veZxHm",
              },
              growth_monthly:{
               plan_id:"price_1MsiO5SFnJmyrDL8AfTIPyl1",
               document_limit:250,
               query_limit:50000,
               inr_plan_id:"price_1MzEWFSFnJmyrDL8sGi2XGq2",
              },
              professional_monthly:{
                 plan_id:"price_1MwfmmSFnJmyrDL83cjjAgEF",
                 document_limit:500,
                 query_limit:100000,
                 inr_plan_id:"price_1MzEXMSFnJmyrDL8hPlv7l9U",
              },
              elite_monthly:{
                 plan_id:"",
                 document_limit:20000,
                 query_limit:200000
              }
         },
         6:{
            basic:{
               document_limit:10,
               query_limit:1000
              },
              standard_monthly:{
               plan_id:"price_1MsiQfSFnJmyrDL86CNgNgZO",
               document_limit:50,
               query_limit:10000,
               inr_plan_id:"price_1MzEVcSFnJmyrDL8x5veZxHm",
              },
              growth_monthly:{
               plan_id:"price_1MsiO5SFnJmyrDL8AfTIPyl1",
               document_limit:250,
               query_limit:50000,
               inr_plan_id:"price_1MzEWFSFnJmyrDL8sGi2XGq2",
              },
              professional_monthly:{
                 plan_id:"price_1MwfmmSFnJmyrDL83cjjAgEF",
                 document_limit:500,
                 query_limit:100000,
                 inr_plan_id:"price_1MzEXMSFnJmyrDL8hPlv7l9U",
              },
              elite_monthly:{
                 plan_id:"",
                 document_limit:20000,
                 query_limit:200000
              }
         }
      }
   }
}