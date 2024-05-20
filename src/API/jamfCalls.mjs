import dotenv from "dotenv";
import fetch from "node-fetch";
import { errorSlackMessages } from "./slackCalls.mjs";
dotenv.config();

const jamfUrl = process.env.JAMF_URL
const jamfToken = process.env.JAMF_TOKEN

// get OAuth token
export async function jamfGetToken() {
    // set options for call
    let headers = {
        "Authorization": `Basic ${jamfToken}`,
        "Content-Type": "application/json"
    };
    let options = {
        "method": "POST",
        "headers": headers
    };
    // Set url with base and endpoint
    const url = `${jamfUrl}api/auth/tokens`
    const jamfResponse = await fetch(url, options)
    const jamfResult = await jamfResponse.json()
    return jamfResult.token
}


export async function jamfCalls(method, endpoint, data) {
    // get OAuth token
    const token = await jamfGetToken()
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
            "Authorization": `Bearer ${token}`
        },
        "body": data,
        "method": method
    }

    // Set url with base and endpoint
    const url = `${jamfUrl}${endpoint}`
    console.log('Jamf Lookup: ', url)
    const jamfData = await fetch(url, REQUEST_OPTIONS)
    const result = await jamfData.json()
    if (response.status !== 200) {
        console.error(response.status)
        throw new Error(response.status)
    }
    else {
        return response
    }
}

// Lookup User devices
export async function jamfLookupUserDevices(user) {
    // lookup computers
    const computers = await jamfCalls('GET', `computers/match/${encodeURI(user.hover_email)}`, null)
    const computerResult = await computers.json()
    return computerResult.computers

}

// Lookup Mobile devices
export async function jamfLookupMobileDevices(user) {
    // lookup mobile devices
    const mobile = await jamfCalls('GET', `mobiledevices/match/${encodeURI(user.hover_email)}`, null)
    const mobileResult = await mobile.json()
    return mobileResult.mobile_devices
}

// Lock machines
export async function jamfLockMachine(user) {
    try {
        // set results array
        const results = []
        // lock computer
        const computer = await jamfCalls('POST', `/computercommands/command/DeviceLock/passcode/${user.jamf_lock_code}/id/${user.jamf_laptop_id}`, null)
        const computerResult = await computer.json()
        results.push(computerResult)
        if (user.jamf_mobile_id === null) {
            return results
        } else {
            // lock mobile devices
            const mobile = await jamfCalls('POST', `/mobiledevicecommands/command/DeviceLock/passcode/${user.jamf_lock_code}/id/${user.jamf_mobile_id}`, null)
            const mobileResult = await mobile.json()
            results.push(mobileResult)
            return results
        }
    } catch (e) {
        console.log('ERROR:', e)
        // send error message to slack
        errorSlackMessages(`Jamf Lock Error: ${e}`)
        return e
    }
}

// assign device to user
export async function jamfAssignDevice(user) {
    // lookup serial number to get jamfId
    const device = await jamfLookupDevice(user.device_serial)
    // add user info to user and location
    const jamfId = device.computers[0].id
    const data = {
        "location": {
            "username": user.hover_email,
            "realname": user.name,
            "email_address": user.hover_email
        }
    }
    const response = await jamfCalls('PUT', `computers/id/${jamfId}`, data)
    const result = await response.json()
    return result
}





