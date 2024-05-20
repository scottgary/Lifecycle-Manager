import { google } from 'googleapis';
import keyfile from './keyfile.json' assert { type: 'json' };
import { errorSlackMessages } from './slackCalls.mjs';
import dotenv from 'dotenv';
dotenv.config();

google.options({
    // All requests made with this object will use these settings unless overridden.
    timeout: 1000,
    auth: keyfile
});
  
const scopes = [
    'https://www.googleapis.com/auth/documents',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/admin.datatransfer',
    'https://www.googleapis.com/auth/admin.directory.group',
    'https://www.googleapis.com/auth/admin.directory.group.member',
    'https://www.googleapis.com/auth/admin.directory.orgunit',
    'https://www.googleapis.com/auth/admin.directory.resource.calendar',
    'https://www.googleapis.com/auth/admin.directory.user',
    'https://www.googleapis.com/auth/admin.directory.user.alias',
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/cloud-platform',
    'https://www.googleapis.com/auth/pubsub'
]

const auth = new google.auth.GoogleAuth({
    keyFilename: keyfile,
      // Scopes can be specified either as an array or as a single, space-delimited string.
    scopes: scopes
});

// Acquire an auth client, and bind it to all future calls
const authClient = await auth.getClient();
google.options({auth: authClient});

// Set const for function use
const adminClient = google.admin('directory_v1');
const calClient = google.calendar({version: "v3"});
const pubSubClient = google.pubsub({version: "v1"});
const sheetClient = google.sheets({version: "v4"});
const docClient = google.docs({version: "v2"});
const driveClient = google.drive({version: "v1"});

/////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////// Google Admin Functions ////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////

// Onboarding - Create Workspace User
export async function createGoogleUser(user) {
    try {
        // Set user object
        let googleUser = {
            // Fill out new hires info for Google Account
            primaryEmail: user.hover_email,
            name: {
              givenName: user.name.split(' ')[0],
              familyName: user.name.split(' ')[1]
            },
            // Generate a random password string.
            password: Math.random().toString(36)
        };
        // Create user and return info to main
        const res = await adminClient.directory.users.insert({requestBody: googleUser });
        return res
    }
    catch(e){
        console.log('ERROR: ', e)
        // alert team that google call failed
        errorSlackMessages(`Google User Creation failed: ${e}`)
        return e
    }
}

export async function getUserByEmail(email) {
    try {
        const res = await adminClient.users.get({userKey: email});
        return res
    }
    catch(e){
        console.log('ERROR: ', e)
        // alert team that google call failed
        errorSlackMessages(`Google User Lookup failed: ${e}`)
        return e
    }
}

export async function removeUserAliases(user) {
    try {
        const alieses = await adminClient.users.aliases.list({userKey: user.hover_email});
        alieses.data.aliases.forEach(alias => {
            adminClient.users.aliases.delete({userKey: user.hover_email, alias: alias.alias})
        });
    } catch(e) {
        console.log('ERROR: ', e)
        // alert team that google call failed
        errorSlackMessages(`Google User Alias Removal failed: ${e}`)
        return e
    }
}

// Offboarding - Move OU and rename account
export async function googleUserOffboardingChanges(user) {
    try {
        // change user name, OU and archive
        var changes = {
            "name": {
              "fullName": `OFFBOARDED_${user.name}`
            },
            "includeInGlobalAddressList": false,
            "archived": true,
            "orgUnitPath": "/Terminated Users",
            "primaryEmail": `OFFBOARDED_${user.hover_email}`
        }
        const res = await adminClient.users.update({userKey: user.hover_email, requestBody: changes});
        return res
    }
    catch(e) {
        console.log('ERROR: ', e)
        // alert team that google call failed
        errorSlackMessages(`Google User Offboarding Changes failed: ${e}`)
        return e
    }
}


// Offboarding - Remove auto-alias and create email fwd'ing group
export async function offboardingEmailForwarding(user) {
    try {
        // remove auto-alias
        const aliases = await adminClient.users.aliases.list({userKey: user.hover_email});
        aliases.data.aliases.forEach(alias => {
            if (alias.alias.includes('auto-alias')) {
                adminClient.users.aliases.delete({userKey: user.hover_email, alias: alias.alias})
            }
        });
        // make new group
        const group = {
            "email": `${user.hover_email}`,
            "name": `${user.hover_email}`,
            "description": `${user.hover_email} fwd'ing group`
        }
        const newGroup = await adminClient.groups.insert({requestBody: group});
        
        // add user to group
        const member = {
            "email": `${user.manager_email}`
        }
        const memberRes = await adminClient.members.insert({groupKey: newGroup.id, requestBody: member});
        return memberRes
    }
    catch(e) {
        console.log('ERROR: ', e)
        // alert team that google call failed
        errorSlackMessages(`Google User Email Forwarding failed: ${e}`)
        return e
    }
}

// Offboarding - Drive Data Transfer
export async function offboardingDriveTransfer(user) {
    try {
        // Google Admin Transfer Files https://developers.google.com/admin-sdk/data-transfer/reference/rest
        var payload = {
            "kind": "admin#datatransfer#DataTransfer",
            "oldOwnerUserId": user.google_id,
            "newOwnerUserId": user.manager_google_id,
            "applicationDataTransfers": [
            {
                "applicationId": "55656082996",
                "applicationTransferParams": [
                {
                    "key": "PRIVACY_LEVEL",
                    "value": [
                    "PRIVATE",
                    "SHARED"
                    ]
                }
                ]
            },
            {
                "applicationId": "435070579839",
                "applicationTransferParams": [
                {
                "key": "RELEASE_RESOURCES",
                    "value": [
                    "TRUE"
                    ]
                }
                ]
            }
            ]
        }
        const res = await adminClient.dataTransfers.insert({requestBody: payload});
        return res
    }
    catch(e) {
        console.log('ERROR: ', e)
        // alert team that google call failed
        errorSlackMessages(`Google User Drive Transfer failed: ${e}`)
        return e
    }    
}

/////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////// Google Drive Functions ////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////

// Offboarding - Shared Drive Removals
export async function offboardingDriveRemovals(user) {
    try {

    }
    catch(e) {
        console.log('ERROR: ', e)
        // alert team that google call failed
        errorSlackMessages(`Google User Drive Removals failed: ${e}`)
        return e
    }   
}

/////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////// Google Calendar Functions /////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////

// Onboarding - Add User to Cal Events
export async function addUserToEvents(user) {
    try {


    }
    catch(e) {
        console.log('ERROR: ', e)
        // alert team that google call failed
        errorSlackMessages(`Google User Calendar Events failed: ${e}`)
        return e
    }
}

// Offboarding - Remove User from Cal Events
export async function removeUserFromEvents(user) {
    try {
        // get all events
        const events = await calClient.events.list({calendarId: user.calendar_id});
        events.data.items.forEach(event => {
            // remove user from event
            calClient.events.delete({calendarId: user.calendar_id, eventId: event.id});
        });
    } catch(e) {
        console.log('ERROR: ', e)
        // alert team that google call failed
        errorSlackMessages(`Google User Calendar Events failed: ${e}`)
        return e
    }
}

/////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////// Google Sheet Functions ////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////

export async function updateSheet(sheetId, range, values) {
    try {
        const request = {
            spreadsheetId: sheetId,
            range: range,
            valueInputOption: 'RAW',
            resource: {
                values: values
            }
        }
        const res = await sheetClient.spreadsheets.values.update(request);
        return res
    } catch(e) {
        console.log('ERROR: ', e)
        // alert team that google call failed
        errorSlackMessages(`Google Sheet Update failed: ${e}`)
        return e
    }
}

export async function getSheet(sheetId, range) {
    try {
        const request = {
            spreadsheetId: sheetId,
            range: range
        }
        const res = await sheetClient.spreadsheets.values.get(request);
        return res
    } catch(e) {
        console.log('ERROR: ', e)
        // alert team that google call failed
        errorSlackMessages(`Google Sheet Get failed: ${e}`)
        return e
    }
}

export async function appendSheet(sheetId, range, values) {
    try {
        const request = {
            spreadsheetId: sheetId,
            range: range,
            valueInputOption: 'RAW',
            resource: {
                values: values
            }
        }
        const res = await sheetClient.spreadsheets.values.append(request);
        return res
    } catch(e) {
        console.log('ERROR: ', e)
        // alert team that google call failed
        errorSlackMessages(`Google Sheet Append failed: ${e}`)
        return e
    }
}

/////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////// PubSub Functions ////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////

export async function publishMessage(topicName, data) {
    try {
        const dataBuffer = Buffer.from(data);
        const messageId = await pubSubClient.topic(topicName).publish(dataBuffer);
        console.log(`Message ${messageId} published.`);
        return messageId;
    }
    catch(e) {
        console.log('ERROR:', e)
        // alert team that pubsub call failed
        errorSlackMessages(`PubSub Message could not be published: ${e}`)
        return e.stack;
    }
}

export async function subscribe(topicName, subscriptionName) {
    try {
        const subscription = pubSubClient.topic(topicName).subscription(subscriptionName);
        subscription.on('message', message => {
            console.log(`Received message: ${message.data}`);
            message.ack();
        });
    }
    catch(e) {
        console.log('ERROR:', e)
        return e.stack;
    }
}

export async function createSubscription(topicName, subscriptionName) {
    try {
        await pubSubClient.topic(topicName).createSubscription(subscriptionName);
        console.log(`Subscription ${subscriptionName} created.`);
    }
    catch(e) {
        console.log('ERROR:', e)
        return e.stack;
    }
}

export async function deleteSubscription(subscriptionName) {
    try {
        await pubSubClient.subscription(subscriptionName).delete();
        console.log(`Subscription ${subscriptionName} deleted.`);
    }
    catch(e) {
        console.log('ERROR:', e)
        return e.stack;
    }
}
// Offboarding - pubsub - send event
export async function offboardingPubSubEvent(userInfo) {
    try {
        const data = JSON.stringify(userInfo);
        const topicName = 'offboarding';
        const messageId = await publishMessage(topicName, data);
        return messageId;
    }
    catch(e) {
        console.log('ERROR:', e)
        // alert team that pubsub call failed
        errorSlackMessages(`PubSub Offboarding Message could not be published: ${e}`)
        return e.stack;
    }
}

// Onboarding - pubsub - send event
export async function onboardingPubSubEvent(userInfo) {
    try {
        const data = JSON.stringify(userInfo);
        const topicName = 'onboarding';
        const messageId = await publishMessage(topicName, data);
        return messageId;
    }
    catch(e) {
        console.log('ERROR:', e)
        // alert team that pubsub call failed
        errorSlackMessages(`PubSub Onboarding Message could not be published: ${e}`)
        return e.stack;
    }
}