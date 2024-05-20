import dotenv from "dotenv";
import fetch from "node-fetch";
import { errorSlackMessages } from './slackCalls.mjs';
import { ToadScheduler, SimpleIntervalJob, AsyncTask } from 'toad-scheduler';
// for use with scheudled tasks
const scheduler = new ToadScheduler();
dotenv.config();

const atlassianUrl = process.env.ATLASSIAN_URL
const atlassianToken = process.env.ATLASSIAN_TOKEN

export async function atlassianCalls(method, endpoint, data) {
    try {
        // if get call change data var to null
        if (!data){
            var data = null
        }
        else {
            JSON.stringify(data)
        }
        // set options for call
        const REQUEST_OPTIONS = {
            "headers": {
                "accept": "application/json",
                "Authorization": `Bearer ${atlassianToken}`
            },
            "body": data,
            "method": method
        }
        // Set url with base and endpoint
        const url = `${atlassianUrl}${endpoint}`
        const atlassianData = await fetch(url, REQUEST_OPTIONS)
        const result = await atlassianData.json()
        if (response.status !== 200) {
            console.error(response.status)
            throw new Error(response.status)
        }
        else {
            return response
        }

    } catch (e) {
        console.log('ERROR:', e)
        // alert team that atlassian call failed
        errorSlackMessages(`Atlassian call failed: \n${e}`)
    }
}

// lookup new user and get id
export async function atlassianLookupUser(user) {
    try {
        const response = await atlassianCalls('GET', `users?username=${user.hover_email}`, null)
        const result = await response.json()
        return result

    } catch (e) {
        console.log('ERROR:', e)
        // alert team that atlassian call failed
        errorSlackMessages(`Atlassian User Lookup failed: \n${e}`)
    }
}

// comment on ticket
export async function atlassianCommentTicket(ticketId, comment) {
    try {
        const response = await atlassianCalls('POST', `issue/${ticketId}/comment`, comment)
        const result = await response.json()
        return result

    } catch (e) {
        console.log('ERROR:', e)
        // alert team that atlassian call failed
        errorSlackMessages(`Atlassian Comment failed: \n${e}`)
    }
}

// create ticket
export async function atlassianCreateTicket(ticket) {
    try {
        const response = await atlassianCalls('POST', `issue`, ticket)
        const result = await response.json()
        return result

    } catch (e) {
        console.log('ERROR:', e)
        // alert team that atlassian call failed
        errorSlackMessages(`Atlassian Create Ticket failed: \n${e}`)
    }
}

// close ticket
export async function atlassianCloseTicket(ticketId) {
    try {
        const response = await atlassianCalls('POST', `issue/${ticketId}/transitions`, {"transition": {"id": "2"}})
        const result = await response.json()
        return result

    } catch (e) {
        console.log('ERROR:', e)
        // alert team that atlassian call failed
        errorSlackMessages(`Atlassian Close Ticket failed: \n${e}`)
    }
}

