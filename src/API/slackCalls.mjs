import { WebClient } from '@slack/web-api'
import dotenv from 'dotenv'
dotenv.config()

const webClient = new WebClient(process.env.SLACK_BOT_TOKEN)

export async function archiveChannel(channelId) {
    try {
        const response = await webClient.conversations.archive({
            channel: channelId
        })
        console.log('Channel Archived: ', response)
        return response
    }
    catch(e) {
        console.log('ERROR:', e)
        // post to slack channel that channel could not be archived
        errorSlackMessages(`Channel could not be archived: <#${channelId}> \n ${e}`)
        return e
    }
}

export async function getUserByEmail(email) {
    try {
        const response = await webClient.users.lookupByEmail({
            email: email
        })
        console.log('User Found: ', response)
        return response
    }
    catch(e) {
        console.log('ERROR:', e)
        // post to slack channel that user could not be found
        errorSlackMessages(`User could not be found: ${email} \n ${e}`)
        return e
    }

}

export async function createChannel(channelName) {
    try {
        const response = await webClient.conversations.create({
            name: channelName
        })
        console.log('Channel Created: ', response)
        return response
    }
    catch(e) {
        console.log('ERROR:', e)
        // post to slack channel that channel could not be created
        errorSlackMessages(`Channel could not be created: ${channelName} \n ${e}`)
        return e
    }
}

export async function inviteToChannel(channelId, userId) {
    try {
        const response = await webClient.conversations.invite({
            channel: channelId,
            users: userId
        })
        console.log('User Invited: ', response)
        return response
    }
    catch(e) {
        console.log('ERROR:', e)
        // post to slack channel that user could not be invited
        errorSlackMessages(`User could not be invited to channel: <#${channelId}> \n <@${userId}> \n ${e}`)
        return e
    }
}

export async function postToChannel(channelId, message) {
    try {
        const messageBlocks = [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": message
                }
            }
        ]
        const response = await webClient.chat.postMessage({
            channel: channelId,
            blocks: messageBlocks,
            text: message
        })
        console.log('Message Sent: ', response)
        return response
    }
    catch(e) {
        console.log('ERROR:', e)
        // post to slack channel that message could not be sent
        errorSlackMessages(`Message could not be sent to channel: <#${channelId}> \n ${e}`)
        return e
    }
}

export async function errorSlackMessages(errorMessage) {
    try {
        const messageBlocks = [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": errorMessage
                }
            }
        ]
        const response = await webClient.chat.postMessage({
            channel: process.env.SLACK_LCM_ALERTS_CHANNEL,
            blocks: messageBlocks,
            text: errorMessage
        })
        console.log('Error Message Sent: ', response)
        return response
    }
    catch(e) {
        console.log('ERROR:', e)
        return e
    }
}
