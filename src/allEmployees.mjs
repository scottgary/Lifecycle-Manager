import fetch from 'node-fetch';
import dotenv from 'dotenv';
import * as oktaCalls from './API/oktaCalls.mjs';
import { tableQuery } from './db/db.mjs';
import { errorSlackMessages } from './API/slackCalls.mjs';

dotenv.config();


// get all active hover users
export async function getAllActiveUsers() {
    try {
        const query = `SELECT * FROM active_users WHERE status = 'active'`
        const dbResponse = await tableQuery(query)
        const data = dbResponse.rows.map(row => {
            return {
                name: row.name,
                email: row.hover_email,
                phone: row.phone,
                start_date: row.start_date,
                manager: row.manager_email,
                department: row.department,
                division: row.division,
                title: row.title,
                location: row.location,
                secondary_email: row.secondary_email,
                is_manager: row.is_manager,

            }
        })
        return data

    } catch (e) {
        console.log('ERROR:', e)
        // alert team that contractor webhook failed
        errorSlackMessages(`Contractor Webhook failed: \n${e}`)
    }
}

// send to offboarding
export async function sendToOffboarding(user) {
    try {
        const query = `INSERT INTO offboarding (name, email, phone, term_date, manager, department) VALUES ('${user.name}', '${user.email}', '${user.phone}', '${user.start_date}', '${user.manager}', '${user.department}')`
        const dbResponse = await tableQuery(query)
        return dbResponse

    } catch (e) {
        console.log('ERROR:', e)
        // alert team that contractor webhook failed
        errorSlackMessages(`Contractor Webhook failed: \n${e}`)
    }
}

// get all hover users
export async function getAllHoverUsers() {
    try {
        // call to okta to get all active users
        const response = await oktaCalls.oktaGetAllUsers()
        const data = await response.json()
        // check each entry in db and add to db if not found
        data.forEach(async user => {
            const query = `SELECT * FROM active_users WHERE hover_email = '${user.profile.email}'`
            const dbResponse = await tableQuery(query)
            if (dbResponse.rows.length == 0) {
                const query = `INSERT INTO active_users (name, hover_email, phone, start_date, manager_email, department, division, title, location, secondary_email, is_manager, status) VALUES ('${user.profile.firstName} ${user.profile.lastName}', '${user.profile.email}', '${user.profile.mobilePhone}', '${user.created}', '${user.manager}', '${user.department}', '${user.division}', '${user.title}', '${user.location}', '${user.profile.secondEmail}', '${user.isManager}', 'active')`
                const dbResponse = await tableQuery(query)
            }
        })
    } catch (e) {
        console.log('ERROR:', e)
        // alert team that contractor webhook failed
        errorSlackMessages(`Contractor Webhook failed: \n${e}`)
    }
}