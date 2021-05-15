const Mailgun = require("mailgun-js");
const Template = require("../models/Template");
const mailgun = new Mailgun({
  apiKey: process.env.MAILGUN_API_KEY,
  domain: process.env.MAILGUN_DOMAIN,
});

const emailInternalHelper = {};
const emailHelper = {};

emailInternalHelper.createTemplatesIfNotExists = async () => {
  try {
    let template = await Template.findOne({ template_key: "verify_email" });
    if (!template) {
      let emailTemplate = new Template({
        name: "Verify Email Template",
        description: "This template is used when user register a new email",
        template_key: "verify_email",
        from: "bachnghianguyen@gmail.com",
        subject: "Hi %name%, welcome to Social blog",
        html: `Hi <strong>%name%</strong>, <br /> Thank you for registration. <br />
        Please confirm your email address by clicking on the link below. <br /> %code% <br />
        If you have any difficulty during the sign-up, do get in touch with our support team: apply@nghia.vn
        <br />Nghia Team`,
        variables: ["name", "code"],
      });
      await emailTemplate.save();
    }
  } catch (error) {
    console.log(error.message);
  }
};

emailHelper.renderEmailTemplate = async (
  template_key,
  variablesObj,
  toEmail
) => {
  try {
    // 1. template is existent in templateSchema?
    const template = await Template.findOne({ template_key });
    if (!template) {
      return { error: "Invalid Template Key" };
    }

    // 2. make data
    const data = {
      from: template.from,
      to: toEmail,
      subject: template.subject,
      html: template.html,
    };
    // 3. dynamic variables to given variables
    for (let i = 0; i < template.variables.length; i++) {
      let key = template.variables[i];
      if (!variablesObj[key]) {
        return { error: `Invalid variable key: missing ${key}` };
      }
      let re = new RegExp(`%${key}%`, "g"); // find all matches rather than stopping after the first match
      data.subject = data.subject.replace(re, variablesObj[key]);
      data.html = data.html.replace(re, variablesObj[key]);
    }
    // 4. return data
    return data;
  } catch (error) {
    console.log(error.message);
  }
};

emailHelper.send = (data) => {
  mailgun.messages().send(data, function (error, info) {
    if (error) {
      console.log(error);
    } else {
      console.log(info);
    }
  });
};

module.exports = { emailInternalHelper, emailHelper };
