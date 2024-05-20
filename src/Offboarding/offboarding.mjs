import * as dateUtils from '../date_utils.mjs';
import * as slackCalls from '../API/slackCalls.mjs';
import * as snipeCalls from '../API/snipeCalls.mjs';
import * as oktaCalls from '../API/oktaCalls.mjs';
import * as atlassianCalls from '../API/atlassianCalls.mjs';
import * as mowCalls from '../API/manowarCalls.mjs';
import * as jamfCalls from '../API/jamfCalls.mjs';
import * as googleCalls from '../API/googleCalls.mjs';
import { tableQuery } from '../db/db.mjs';
import { ToadScheduler, SimpleIntervalJob, AsyncTask } from 'toad-scheduler';
import dotenv from "dotenv";

const scheduler = new ToadScheduler();
dotenv.config();

// deactivate user
export async function deactivateUser(user) {
    try {
        // kickoff message
        let message = `LCM is starting deactivation for ${user.email}`
        await slackCalls.postToChannel(process.env.SLACK_LCM_ALERTS_CHANNEL, message)

        // clear sessions
        await oktaCalls.oktaClearUserSessions(user)
        await atlassianCalls.atlassianCommentTicket(user.ticket_id, `Clearing User Sessions at epoch: ${dateUtils.getCurrentEpoch()}`)
        // write to db with timestamp
        let query = `UPDATE offboarding SET okta_clear_sessions_date = ${dateUtils.getCurrentDate()} WHERE email = '${user.hover_email}'`
        await tableQuery(query)   

        // suspend user
        await oktaCalls.oktaSuspendUser(user)
        await atlassianCalls.atlassianCommentTicket(user.ticket_id, `Suspending User at epoch: ${dateUtils.getCurrentEpoch()}`) 

        // lock device
        await jamfCalls.jamfLockMachine(user)
        await atlassianCalls.atlassianCommentTicket(user.ticket_id, `Locking Device at epoch: ${dateUtils.getCurrentEpoch()}`)
        // write to db with timestamp
        query = `UPDATE offboarding SET jamf_lock_date = ${dateUtils.getCurrentDate()} WHERE email = '${user.hover_email}'`
        await tableQuery(query) 

        // transfer files
        await googleCalls.offboardingDriveTransfer(user)
        await atlassianCalls.atlassianCommentTicket(user.ticket_id, `Transferring Drive Files at epoch: ${dateUtils.getCurrentEpoch()}`)
        // write to db with timestamp
        query = `UPDATE offboarding SET google_drive_transfer_date = ${dateUtils.getCurrentDate()} WHERE email = '${user.hover_email}'`
        await tableQuery(query)

        // fob deactivation (SF ONLY)
        if (user.location === 'San Francisco') {
            const message = `LCM is deactivating ${user.email} who is located in San Francisco. Please deactivate their fob.`
            await slackCalls.postToChannel('C028P14KJV9', message) // C028P14KJV9 - workit
            await atlassianCalls.atlassianCommentTicket(user.ticket_id, `Deactivating Fob at epoch: ${dateUtils.getCurrentEpoch()}`)
        }

        // update asset to expecting return
        await snipeCalls.snipeUpdateDevice(user)
        await atlassianCalls.atlassianCommentTicket(user.ticket_id, `Updating Device to Expecting Return at epoch: ${dateUtils.getCurrentEpoch()}`)

        // clear aliases
        await googleCalls.clearAliases(user)
        await atlassianCalls.atlassianCommentTicket(user.ticket_id, `Clearing Aliases at epoch: ${dateUtils.getCurrentEpoch()}`)

        // rename, de-list, archive, OU changes
        await googleCalls.offboardingGoogle(user)
        await atlassianCalls.atlassianCommentTicket(user.ticket_id, `Offboarding Google at epoch: ${dateUtils.getCurrentEpoch()}`)

        // email forwarding
        await googleCalls.offboardingEmailForwarding(user)
        await atlassianCalls.atlassianCommentTicket(user.ticket_id, `Email Forwarding at epoch: ${dateUtils.getCurrentEpoch()}`)
        // write to db with timestamp
        query = `UPDATE offboarding SET google_email_fwd_date = ${dateUtils.getCurrentDate()} WHERE email = '${user.hover_email}'`
        await tableQuery(query)

        // deactivate user
        await oktaCalls.oktaDeactivateUser(user)
        await atlassianCalls.atlassianCommentTicket(user.ticket_id, `Deactivating User at epoch: ${dateUtils.getCurrentEpoch()}`)
        // write to db with timestamp
        query = `UPDATE offboarding SET okta_deactivation_date = ${dateUtils.getCurrentDate()} WHERE email = '${user.hover_email}'`
        await tableQuery(query)

        // MoW (Staging & Prod) LCM actions
        await mowCalls.checkForManowarUser(user)
        await mowCalls.deleteManowarUser(user)
        await atlassianCalls.atlassianCommentTicket(user.ticket_id, `MoW Actions at epoch: ${dateUtils.getCurrentEpoch()}`)
        
        // device return message to jira ticket
        message = `LCM is deactivating ${user.email}. Please fill out a device return request in the Computer Care portal.`
        await slackCalls.postToChannel(process.env.SLACK_LCM_ALERTS_CHANNEL, message)
        await atlassianCalls.atlassianCommentTicket(user.ticket_id, `Please fill out a device return request in the Computer Care portal.`)
        // file new ticket in IT_HELP for device return
        const ticketInfo = {
            fields: {
                project: {
                    key: 'IT-HELP',
                },
                summary: `User Offboarding - ${user.email} Device return request`,
                description: `Please submit a Computer Care Device return request for: ${user.email} \n Device: ${user.deviceId} \n Location: ${user.location}`,
                issuetype: {
                    name: 'Service Request',
                },
            },
        };
        await atlassianCalls.atlassianCreateTicket(ticketInfo)


        // completed message
        message = `LCM has completed deactivation for ${user.email}`
        await slackCalls.postToChannel(process.env.SLACK_LCM_ALERTS_CHANNEL, message)
        await atlassianCalls.atlassianCommentTicket(user.ticket_id, `Deactivation Complete at epoch: ${dateUtils.getCurrentEpoch()}`)

    } catch (e) {
        console.log('ERROR:', e)
    }
}

// offboarding webhook processing
export async function offboardingWebhook(req, res) {
    try {
        // parse hook data
        const { "Full Name": name, "Work Email": hoverEmail, "Personal Email": personalEmail, "Timezone": timezone, "Office Location": location, "Termination Date": term_date, "Termination Type":term_type, "Manager": managerName } = req.body;
        console.log(name, hoverEmail, personalEmail, location, term_date, term_type, timezone, managerName)

        // setup user object
        const user = {
            name: name,
            hover_email: hoverEmail,
            secondary_email: personalEmail,
            timezone: timezone,
            location: location,
            term_date: term_date,
            term_type: term_type,
            manager_name: managerName,
            manager_email: null,
            okta_id: null,
            jamf_machine_id: null,
            jamf_machine_serial: null,
            jamf_machine_udid: null,
            jamf_machine_model: null,
            jamf_machine_asset_tag: null,
            user_mobile_device: false,
            jamf_mobile_id: null,
            jamf_mobile_serial: null,
            jamf_mobile_udid: null,
            jamf_mobile_model: null,
            jamf_mobile_asset_tag: null,
            ticket_id: null,
            google_id: null,
            google_manager_id: null,
            user_phone: null,
            user_address_street: null,
            user_address_street1: null,
            user_address_city: null,
            user_address_state: null,
            user_address_zip: null,
            jamf_lock_code: null,
            user_return_request: null,
        }

        // Look up user in Okta to get the rest of the data
        const oktaResponse = await oktaCalls.getUserByEmail(user)
        console.log(oktaResponse)
        user.okta_id = oktaResponse[0].id
        user.manager_email = oktaResponse[0].profile.managerEmail
        user.user_address_street = oktaResponse[0].profile.postalAddress
        user.user_address_street1 = oktaResponse[0].profile.postalAddress2 || null
        user.user_address_city = oktaResponse[0].profile.city
        user.user_address_state = oktaResponse[0].profile.state
        user.user_address_zip = oktaResponse[0].profile.zip
        user.user_phone = oktaResponse[0].profile.mobilePhone || null

        // create jamf lock code and get jamf machine info
        user.jamf_lock_code = Math.floor(111111 + Math.random() * 999999);
        const jamfMachine = await jamfCalls.jamfLookupUserDevices(user)
        user.jamf_machine_id = jamfMachine.computer.id
        user.jamf_machine_serial = jamfMachine.computer.serial_number
        user.jamf_machine_udid = jamfMachine.computer.udid
        user.jamf_machine_model = jamfMachine.computer.model
        user.jamf_machine_asset_tag = jamfMachine.computer.asset_tag
        const jamfMobileDevice = await jamfCalls.jamfLookupMobileDevices(user)
        user.jamf_mobile_id = jamfMobileDevice.mobile_device.id || null
        user.jamf_mobile_serial = jamfMobileDevice.mobile_device.serial_number || null
        user.jamf_mobile_udid = jamfMobileDevice.mobile_device.udid || null
        user.jamf_mobile_model = jamfMobileDevice.mobile_device.model || null
        user.jamf_mobile_asset_tag = jamfMobileDevice.mobile_device.asset_tag || null


        // create ticket in Jira and get ID/ KEY
        const ticketInfo = {
            fields: {
                project: {
                    key: 'EMOB',
                },
                summary: `Offboarding - ${user.hover_email}`,
                description: `Offboarding request for ${user.hover_email} \n Manager: ${user.manager_email} \n Location: ${user.location} \n Termination Date: ${user.term_date} \n Termination Type: ${user.term_type} \n Manager: ${user.manager_name} \n Address: ${user.user_address_street} ${user.user_address_street1} ${user.user_address_city}, ${user.user_address_state} ${user.user_address_zip}`,
                issuetype: {
                    name: 'Task',
                },
            },
        };
        const ticket = await atlassianCalls.atlassianCreateTicket(ticketInfo)
        user.ticket_id = ticket.id

        // lookup user and manager info in google to get IDs
        const googleUser = await googleCalls.getUserByEmail(hoverEmail)
        user.google_id = googleUser.id
        const manager = await googleCalls.getUserByEmail(managerEmail)
        user.google_manager_id = manager.id


        // Add user info into offboarding table
        const queryValues = [user.name, user.hover_email, user.term_date, user.timezone, user.term_type, user.manager_name, user.location, user.okta_id, user.jamf_machine_asset_tag, user.jamf_machine_serial, user.jamf_machine_id, user.jamf_machine_udid, user.jamf_lock_code, user.ticket_id, user.google_id, user.google_manager_id, user.jamf_mobile_device, user.jamf_mobile_serial, user.jamf_mobile_udid, user.jamf_mobile_model, user.secondary_email, user.user_phone, user.user_address_street, user.user_address_street1, user.user_address_city, user.user_address_state, user.user_address_zip]
        const query = 'INSERT into offboarding(name, hover_email, last_day, user_tz, term_type, user_manager, location, okta_id, assigned_device_tag, assigned_device_serial, assigned_device,udid, jamf_lock_code, jira_ticket_key, google_id, google_manager_id, user_mobile_device, user_mobile_device_serial, user_mobile_device_udid, user_mobile_device_model, secondary_email, user_phone, user_address_street, user_Address_street1, user_address,city, user_address_state, user_address_zip) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29) RETURNING *';
        const result = await tableQuery(query, queryValues);
        const data = result.rows;
        return data

    } catch (e) {
        console.log('ERROR:', e)
    }
}

// offboarding users endpoint
export async function offboardingUsers() {
    try {
        const query = `SELECT * FROM offboarding WHERE term_date >= CURRENT_DATE()`
        const users = await tableQuery(query)
        const data = users.rows.map(user => {
            return {
                name: user.name,
                hover_email: user.hover_email,
                last_day: user.last_day,
                user_tz: user.user_tz,
                term_type: user.term_type,
                user_manager: user.user_manager,
                location: user.location,
                okta_id: user.okta_id,
                assigned_device_tag: user.assigned_device_tag,
                assigned_device_serial: user.assigned_device_serial,
                assigned_device: user.assigned_device,
                udid: user.udid,
                jamf_lock_code: user.jamf_lock_code,
                jira_ticket_key: user.jira_ticket_key,
                google_id: user.google_id,
                google_manager_id: user.google_manager_id,
                user_mobile_device: user.user_mobile_device,
                user_mobile_device_serial: user.user_mobile_device_serial,
                user_mobile_device_udid: user.user_mobile_device_udid,
                user_mobile_device_model: user.user_mobile_device_model,
                secondary_email: user.secondary_email,
                user_phone: user.user_phone,
                user_address_street: user.user_address_street,
                user_address_street1: user.user_address_street1,
                user_address_city: user.user_address_city,
                user_address_state: user.user_address_state,
                user_address_zip: user.user_address_zip
            }
        })
        return data
    } catch (e) {
        console.log('ERROR:', e)
    }
}

// sensitive terms
export async function sensitiveTerms(user) {
    try {
        // create slack channel for term team
        const channel = await slackCalls.createSlackChannel(user)
        // invite term team to channel
        await slackCalls.inviteToSlackChannel(channel.id, process.env.SLACK_TERM_TEAM)
        // post message to channel
        const message = `:rotating_light: *Sensitive Terms Detected* :rotating_light: \n A Sensitive term have been started in the offboarding request for ${user.name}. Future updates will all ve posted here for records.`
        await slackCalls.postToChannel(channel.id, message)
        // start term process
        const term = await deactivateUser(user)
        
    } catch (e) {
        console.log('ERROR:', e)
        // alert team that sensitive terms check failed
        slackCalls.errorSlackMessages(`Sensitive Terms Check failed: ${e}`)
    }
}

// daily runs
export async function dailyOffboardingRuns(timezone) {
    try {
        // get all users who are marked for offboarding
        const query = `SELECT * FROM offboarding WHERE term_date = CURRENT_DATE() AND user_timezone = $1`
        const queryValues = [timezone]
        const users = await tableQuery(query)

        // loop through users
        for (let user of users) {
            deactivateUser(user)
        }

    } catch (e) {
        console.log('ERROR:', e)
        // alert team that daily offboarding runs failed
        slackCalls.errorSlackMessages(`Daily Offboarding Runs failed: ${e}`)
    }
}

// schedule runs at EOD
// const estTask = new AsyncTask('simple task', dailyOffboardingRuns, ['EST'])
// const estJob = new CronJob(
//     {
//         cronExpression: '0 17 * * *',
//     },
//     task,
//     {
//         preventOverrun: true,
//     }
// )
// scheduler.addCronJob(estJob)

// const cstTask = new AsyncTask('simple task', dailyOffboardingRuns, ['CST'])
// const cstJob = new CronJob(
//     {
//         cronExpression: '0 18 * * *',
//     },
//     task,
//     {
//         preventOverrun: true,
//     }
// )
// scheduler.addCronJob(cstJob)

// const pstTask = new AsyncTask('simple task', dailyOffboardingRuns, ['PST'])
// const pstJob = new CronJob(
//     {
//         cronExpression: '0 20 * * *',
//     },
//     task,
//     {
//         preventOverrun: true,
//     }
// )
// scheduler.addCronJob(pstJob)


