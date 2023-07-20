module.exports = class TermAndPrivacyController{


    /**
     * Get terms
     * 
     * @param {*} req 
     * @param {*} res 
     */
    async getTermsAndCondition(req,res){
        let data=(`<div class="custom-container">
      
        <div class="content">
          <p class="p1 mb-5">
            By accessing this application we assume you accept these terms and
            conditions in full. Do not continue to use Application if you do not
            accept all of the terms and conditions stated on this page.
          </p>
          <p class="p1 mb-5">
            Your agree that you should be 18+. If you are below 18, only use it after
            parent/guardian's permission. Do not transmit abuse, sexually harass
            anyone, publicize other peoples' private information, make statements that
            defame or libel anyone, violate intellectual property rights, use
            automated programs to start chats, or behave in any other inappropriate or
            illegal way on YourGPT. Use YourGPT at your own peril. Block the person
            immediately for any misbehavior. There is no tolerance for objectionable content 
            or abusive users so you give us full authority to take any desired action in such case.
          </p>
          <p class="p1 mb-5">
            The following terminology applies to these Terms and Conditions, Privacy
            Statement and Disclaimer Notice and any or all Agreements: "Client", "You"
            and "Your" refers to you, the person accessing this website and accepting
            the Company's terms and conditions. "The Company", "Ourselves", "We",
            "Our" and "Us", refers to our Company. "Party", "Parties", or "Us", refers
            to both the Client and ourselves, or either the Client or ourselves. All
            terms refer to the offer, acceptance and consideration of payment
            necessary to undertake the process of our assistance to the Client in the
            most appropriate manner, whether by formal meetings of a fixed duration,
            or any other means, for the express purpose of meeting the Client's needs
            in respect of provision of the Company's stated services/products, in
            accordance with and subject to, prevailing law of . Any use of the above
            terminology or other words in the singular, plural, capitalisation and/or
            he/she or they, are taken as interchangeable and therefore as referring to
            same.
          </p>
          <h4 class="h4 text-black font-semibold fs-18 mb-3">Cookies</h4>
          <p class="p1 mb-5">
            We employ the use of cookies. By using YourGPT application you consent to
            the use of cookies in accordance with YourGPT privacy policy. Most of the
            modern day interactive websites use cookies to enable us to retrieve user
            details for each visit. Cookies are used in some areas of our site to
            enable the functionality of this area and ease of use for those people
            visiting. Some of our affiliate / advertising partners may also use
            cookies. License
          </p>
          <p class="p1 mb-5">
            Unless otherwise stated, YourGPT and/or it's licensors own the intellectual
            property rights for all material on YourGPT. All intellectual property
            rights are reserved.
          </p>
          <h4 class="h4 text-black font-semibold fs-18 mb-3">
            Information Collection
          </h4>
          <p class="p1 mb-5">
            When you download and install the App, we automatically receive certain
            types of information about you, including technical information about your
            device (including IP address) and information about your mobile carrier,
            device model, operating system version, language preferences, the date and
            time you downloaded the App, and the application usage history. We also
            collect information if you are participating in any QA &amp; Pools.
          </p>
          <h4 class="h4 text-black font-semibold fs-18 mb-3">Security</h4>
          <p class="p1 mb-5">
            The security of your Personal Information is important to us, but remember
            that no method of transmission over the Internet, or method of electronic
            storage is 100% secure. While we strive to use commercially acceptable
            means to protect your Personal Information, we cannot guarantee its
            absolute security.
          </p>
          <h4 class="h4 text-black font-semibold fs-18 mb-3">Advertisements</h4>
          <p class="p1 mb-5">
            Ads appearing on our application may be delivered to users by advertising
            partners, who may set cookies. These cookies allow the ad server to
            recognize your device each time they send you an online advertisement to
            compile information about you or others who use your computer. This
            information allows ad networks to, among other things, deliver targeted
            advertisements that they believe will be of most interest to you. This
            Privacy Policy covers the use of cookies by YourGPT and does not cover the
            use of cookies by any advertisers.
          </p>
      
      
          <h4 class="h4 text-black font-semibold fs-18 mb-3">
            REPORTING AND CORRECTING VIOLATIONS
          </h4>
          <p class="p1 mb-5">
            If you become aware of any violation of these Site Terms and Conditions,
            you must immediately report it to support Service. You agree to assist us
            with any investigation we undertake and to take any remedial steps we
            require in order to correct a violation of these Site Terms and
            Conditions.
          </p>
          <h4 class="h4 text-black font-semibold fs-18 mb-3">
          COMPLIANCE AND PROHIBITED ACTIONS
          </h4>
         <p class="p1 mb-5">
         You will not use the Services in any way or for any purpose that would violate, or would have the effect of violating, any applicable laws, rules or regulations or any rights of any third-parties, including without limitation, any law or right regarding any copyright, patent, trademark, trade secret, or other proprietary or property right, false advertising, telemarketing, unfair competition, defamation, invasion of privacy, or other federal or state law, rule, or regulation.
          <br></br>
         You further represent and warrant that you will not use the Website, the Application, or the Services to defraud, cause harm, wrongly obtain anything of value, send indecent or obscene content, or to annoy, abuse, threaten, harass, or send reapeated Anonymous Messages to another person. You represent and warrant that you do not have any intent to commit any of the foregoing actions. You represent and warrant that you will not use the Website, the Application, or the Services for harrasing or abusing someone.
      
         </p>
      
          <h4 class="h4 text-black font-semibold fs-18 mb-3">
          USER-GENERATED CONTENT
          </h4>
          <p class="p1 mb-5">
      a. User Content License. You expressly acknowledge and agree that by posting, distributing or otherwise making available through YourGPT the User Content, You grant Us (and warrant and represent that You have the right to grant Us) a perpetual, irrevocable, royalty-free, worldwide, non-exclusive, assignable, sublicensable, transferable license to use, store, copy, perform, display, distribute, prepare derivative works of, or incorporate into other works, the User Content for any purpose, on any platform. The preceding rights include, without limitation, Our right to: (i) publicly post the recording from any telephone conversation initiated through YourGPT; (ii) remove or not remove any User content for any reason or no reason at all, in Our sole discretion; (iii) to decide whether to publish, withdraw, postpone, or alter any User content, (iv) to screen, monitor, or filter any User content, and (v) to determine, in Our sole discretion, whether and how long to store any User content.
      <br></br>
      b. Rules of Conduct. In addition to all other obligations and terms stated in these Terms, you agree to abide by any rules of conduct or community guidelines posted on the Website or Application. YourGPT reserves the right to exclude or suspend any user who violates these rules of conduct, and reserves the right, but does not undertake an affirmative obligation, to remove, screen, or edit any content which is contrary to these rules without prior notice. User Content does not necessarily reflect the opinion of YourGPT.
      <br></br>
      c.  Communications Decency: YourGPT is only a distributor, and not the publisher or speaker, of any User Content. As such, YourGPT cannot be held liable for making available any User Content which may be false or inaccurate. Any information or opinions contained in the User Content made available through the services are those of their respective authors alone. YourGPT does not guarantee the accuracy, completeness, or truthfulness of any User Content. Under no circumstances will YourGPT be responsible for any loss or damage resulting from any person's reliance on any User Content.
      <br></br>
      d.  Reservation of Rights: YourGPT reserves the right to remove or not remove any User Content from the Services for any reason or no reason at all, in YourGPT's sole discretion. This reservation includes the exclusive right to decide whether to publish, withdraw, postpone, or alter any User Content. YourGPT reserves the right, but does not undertake any affirmative obligation, to screen, monitor, or filter User Content.
      <br></br>
      e. Information Storage and Access: YourGPT reserves the right, in its sole discretion, to determine whether and how long to store User Content and user data. YourGPT will not be responsible for any liability related to the deletion or removal or any data or content maintained on the Services or YourGPT's servers.
      <br></br>
      f. Suggestions: By sending us any ideas, suggestions, documents or proposals ("Feedback"), you agree that (i) your Feedback does not contain the confidential or proprietary information of third-parties, (ii) we are under no obligation of confidentiality, express or implied, with respect to the Feedback, (iii) we may have something similar to the Feedback already under consideration or in development, and (iv) you grant us an irrevocable, non-exclusive, royalty-free, perpetual, worldwide license to use, modify, prepare derivative works, publish, distribute and sublicense the Feedback, and you irrevocably waive, and cause to be waived, against YourGPT and its users any claims and assertions of any rights, whether intellectual property rights or otherwise, contained in such Feedback.
      <br></br>
          </p>
         
          <h4 class="h4 text-black font-semibold fs-18 mb-3">
          CHANGE TO TERMS AND CONDITIONS
          </h4>
          <p class="p1 mb-5">
          We reserve the right, at Our sole discretion, to modify or replace these Terms at any time. By continuing to access or use Our Service after those revisions become effective, You agree to be bound by the revised terms. If You do not agree to the new terms, in whole or in part, please stop using the Service. 
          </p>
        </div>
      </div>
      `);
        return res.status(200).send({type:"RXSUCCESS","data":data});
    }
  
    /**
     * Get getPrivacy
     * 
     * @param {*} req 
     * @param {*} res 
     */
    async getPrivacyPolicy(req,res){
        let data=(`<div class="custom-container">
        <div class="header mb-10 text-center">
           <h2 class="h2 fs-32 text-black">Privacy Policy</h2>
        </div>
        <div class="content">
           <h4 class="h4 text-black font-semibold fs-18 mb-3">Overview</h4>
           <p class="p1 mb-5">Our privacy policy is to respect your privacy regarding any information we may collect while operating our application. This Privacy Policy applies to YourGPT.ai (hereinafter, "us", "we, or YourGPT.ai "). We respect your privacy and are committed to protecting personally identifiable information you may provide us through the application. We have adopted this privacy policy ("Privacy Policy") to explain what information may be collected on our application, how we use this information, and under what circumstances we may disclose the information to third parties. 
           This Privacy Policy applies only to information we collect through the application and does not apply to our collection of information from other sources.</p>
            <p>We reserve the right to modify this privacy policy at any time, so please review it frequently. Changes and clarifications will take effect immediately upon their posting on the website. If we make changes to this policy, we will notify you here that it has been updated, so that you are aware of what information we collect, how we use it, and under what circumstances, if any, we use and/or disclose it.</p>
            <h4 class="h4 text-black font-semibold fs-18 mb-3">How we protect your information</h4>
            <p>YourGPT is committed to safeguarding your personal data from unauthorized access or misuse. We use various technical and organizational measures to ensure the security and confidentiality of your data on our site. However, we cannot guarantee that your data will be completely safe during transmission over the internet, as this is beyond our control. Therefore, you are responsible for any risks associated with sending your data to our site. We appreciate your trust and cooperation in this matter.</p>
            
           <h4 class="h4 text-black font-semibold fs-18 mb-3">Types of Data Collected</h4>
           <div>
            <h4 class="h4 text-black font-semibold fs-18 mb-3">Personal Data</h4>
            <p class="p1 mb-5">While using our service, we may ask you to provide us with certain personally identifiable information that can be used to contact or identify You. Personally, identifiable information may include but is not limited to the Usage of Data When using our Service, we may ask you to provide us with certain personally identifiable information that can be used to contact or identify you.</p>
            <h4 class="h4 text-black font-semibold fs-18 mb-3">Usage Data</h4>
            <p class="p1 mb-5">&zwj;Usage Data has collected automatically when any user uses the Service. Data may include information such as Your Device's Internet Protocol address (e.g. IP address), browser type, browser version, the pages of our Service that You visit, the time and date of Your visit, the time spent on those pages, unique device identifiers and other diagnostic data.</p>
            <p class="p1 mb-5">When You access the Service through a mobile device, We may collect certain information automatically including, your mobile device’s unique ID, the IP address of Your mobile device and We may also collect information that Your browser sends whenever you visit our Services.</p>
            
            <h4 class="h4 text-black font-semibold fs-18 mb-3">Account Privacy</h4>
            <p class="p1 mb-5">When you create an account on the Services, you will need to share your basic personal information such as username, password, age, email address, and phone number in order to provide you with the Services. We use your age to verify that you can lawfully use the Services and to adjust content to your age, we use your email ID and phone number to verify your account</p>
            
            <h4 class="h4 text-black font-semibold fs-18 mb-3">Children's Privacy</h4>
            <p class="p1 mb-5">Our service does not address anyone under the age of 12. If you are a parent or guardian and you know that your child has provided us with personal data, please contact us in that context as well. If we become aware that we have collected personal data from anyone under the age of 12 without verification of parental consent, we take steps to delete that information from our servers.</p>
            <p class="p1 mb-5">If we need to rely on consent as a legal basis for processing your information and your country requires consent from a parent, we may need to ask your parent(s) before we collect and use that information</p>
            <h4 class="h4 text-black font-semibold fs-18 mb-3">Get notifications and email</h4>
            <p class="p1 mb-5">You may occasionally receive emails and other notifications from us. Administrative communications relating to your account (for eg. Account recovery, and password reset) are considered part of the service.</p>
            <h4 class="h4 text-black font-semibold fs-18 mb-3">Account information on Third party services</h4>
            <p class="p1 mb-5">
            In order to provide you with our service, we may share your information with other Software as a Service (SaaS) providers who are essential for the functioning of our platform. 
            This may include sharing necessary information such as user account details, payment information, and usage data with these SaaS providers. 
            We ensure that any sharing of your information with these providers is done in compliance with applicable laws and regulations, and that appropriate measures are taken to protect the confidentiality and security of your information.
            </p>
            <h4 class="h4 text-black font-semibold fs-18 mb-3">Links to Other Websites</h4>
            <p class="p1 mb-5">Our Service may contain links to other websites that are not operated by us. And We have no control over and assume no responsibility for the content, privacy policies, or practices of any third-party sites or services. If you click on a third-party link, you will be directed to that third party’s site. We strongly recommend that you review the Privacy Policy before visiting each site.</p>
            <h4 class="h4 text-black font-semibold fs-18 mb-3">Financial Information</h4>
            <p class="p1 mb-5">We may collect information related to your payment method (valid debit or credit card number, type, expiration date, or other financial information) You should share that information only if you wish to purchase our paid plans. However, we do not store that financial information in our database.</p>
            <h4 class="h4 text-black font-semibold fs-18 mb-3">Security</h4>
            <p class="p1 mb-5">The security of your Personal Information is important to us, but remember that no method of transmission over the Internet, or method of electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your Personal Information, we cannot guarantee its absolute security.</p>
           </div>

           <h4 class="h4 text-black font-semibold fs-18 mb-3">Contact Us</h4>
           <p class="p1 mb-5">If you have any queries or need any kind of help, You can directly contact us:<br><span>By email: <span class="font-bold ml-2">support@yourgpt.ai</span></span></p>
        
          </div>
     </div>`);
        return res.status(200).send({type:"RXSUCCESS","data":data});
    }
}
