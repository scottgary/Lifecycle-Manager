import fetch from "node-fetch";
import { errorSlackMessages } from './slackCalls.mjs';
import dotenv from "dotenv";
dotenv.config();

// https://developer.knowbe4.com/rest/reporting#tag/Training

const knowBe4Url = process.env.KNOWBE4_URL
const knowBe4Token = process.env.KNOWBE4_TOKEN

// Lookup user by email
export async function knowBe4LookupUser(email) {
    try {
        const response = await fetch(`${knowBe4Url}/users?email=${encodeURI(email)}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${knowBe4Token}`
            }
        });
        const result = await response.json()
        return result

    } catch (e) {
        console.log('ERROR:', e)
        // alert team that knowBe4 call failed
        errorSlackMessages(`KnowBe4 User Lookup failed: \n${e}`)
    }
}

// check users trainings status

// 15 days past hire date check training status


// 20 days past hire date check training status


// 28 days message jenn to check training status
