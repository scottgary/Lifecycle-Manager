import fetch from "node-fetch";
import { errorSlackMessages } from './slackCalls.mjs';
import dotenv from "dotenv";

dotenv.config();

// jotform calls
export async function jotformCalls(method, endpoint, data) {
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
                "APIKEY": process.env.JOTFORM_API_KEY
            },
            "body": data,
            "method": method
        }
        // Set url with base and endpoint
        const url = `${process.env.JOTFORM_URL}${endpoint}`
        const jotformData = await fetch(url, REQUEST_OPTIONS)
        const result = await jotformData.json()
        return result

    } catch (e) {
        console.log('ERROR:', e)
        // alert team that jotform call failed
        errorSlackMessages(`Jotform call failed: \n${e}`)
    }
}

// get jotform submissions
export async function jotformGetSubmissions() {
    try {
        const response = await jotformCalls('GET', `form/${process.env.JOTFORM_FORM_ID}/submissions`, null)
        const result = await response.json()
        return result
        
    } catch (e) {
        console.log('ERROR:', e)
        // alert team that jotform call failed
        errorSlackMessages(`Jotform call failed: \n${e}`)
    }
}

// get jotform submission by id
export async function jotformGetSubmissionById(id) {
    try {
        const response = await jotformCalls('GET', `submission/${id}`, null)
        const result = await response.json()
        return result

    } catch (e) {
        console.log('ERROR:', e)
        // alert team that jotform call failed
        errorSlackMessages(`Jotform call failed: \n${e}`)
    }
}

