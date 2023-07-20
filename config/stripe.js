payment_test_mode = env("PAYMENT_TEST_MODE","");

if(payment_test_mode===true){
    module.exports = {
        stripe_secret_key : env("STRIPE_TEST_SECRET_KEY","")
    }
}
else {
    module.exports = {
        stripe_secret_key : env("STRIPE_LIVE_SECRET_KEY","")
    }
}
