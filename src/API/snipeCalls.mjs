import fetch from "node-fetch";
import { errorSlackMessages } from './slackCalls.mjs';
import dotenv from "dotenv";
dotenv.config();

const snipeUrl = process.env.SNIPE_URL
const snipeToken = process.env.SNIPE_TOKEN


export async function snipeCalls(method, endpoint, data) {
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
            "Authorization": "Bearer "+snipeToken
        },
        "body": data,
        "method": method
    }

    // Set url with base and endpoint
    const url = `${snipeUrl}${endpoint}`
    console.log('Snipe Lookup: ', url)
    const snipeData = await fetch(url, REQUEST_OPTIONS)
    const result = await snipeData.json()
    if (response.status !== 200) {
        console.error(response.status)
        throw new Error(response.status)
    }
    else {
        return response
    }
}

// checkout asset
export async function snipeAssignDevice(user) {
    // assign device to user
    const data = {
        "assigned_to": user.hover_email
    }
    const response = await snipeCalls('POST', `hardware/${user.device_id}/assign`, data)
    const result = await response.json()
    return result
}

// checkin asset
export async function snipeUnassignDevice(user) {
    // unassign device from user
    const data = {
        "assigned_to": null
    }
    const response = await snipeCalls('POST', `hardware/${user.device_id}/assign`, data)
    const result = await response.json()
    return result
}

// lookup device by serial number
export async function snipeLookupDeviceBySerial(serial) {
    const response = await snipeCalls('GET', `hardware/byserial/${serial}`, null)
    const result = await response.json()
    return result
}


// lookup device by asset tag
export async function snipeLookupDeviceByTag(asset) {
    const response = await snipeCalls('GET', `hardware/bytag/${asset}`, null)
    const result = await response.json()
    return result
}


// lookup device by user
export async function snipeLookupDeviceByEmail(user) {
    const response = await snipeCalls('GET', `hardware/byuser/${encodeURI(user.hover_email)}`, null)
    const result = await response.json()
    return result
}


// Update device to expecting return
export async function snipeUpdateDevice(user) {
    // update device to expecting return
    const data = {
        "status_id": 3
    }
    const response = await snipeCalls('POST', `hardware/${user.device_id}/update`, data)
    const result = await response.json()
    return result
}
