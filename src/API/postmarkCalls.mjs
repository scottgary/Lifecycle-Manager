import { ServerClient } from "postmark";
import { errorSlackMessages } from './slackCalls.mjs';
import dotenv from "dotenv";
dotenv.config();

const postmarkToken = process.env.POSTMARK_TOKEN;
// Setup client connection:
const client = new ServerClient(postmarkToken);

// Send an email:
export async function sendEmailFromTemplate(templateInfo) {
    try {
        // send email from template to user
        var response = client.sendEmailWithTemplate({
            "From": templateInfo.from,
            "To": templateInfo.to,
            "TemplateId": templateInfo.templateId,
            "TemplateModel": templateInfo.templateModel
        });
        console.log('Email Sent: ', response)

    }
    catch(e) {
        console.log('ERROR:', e)
        // alert team that postmark call failed
        errorSlackMessages(`Email could not be sent: ${e}`)
    }
    return response
}
