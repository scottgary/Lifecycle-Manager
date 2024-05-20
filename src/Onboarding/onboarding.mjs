import * as dateUtils from '../date_utils.mjs';
import * as slackCalls from '../API/slackCalls.mjs';
import * as snipeCalls from '../API/snipeCalls.mjs';
import * as oktaCalls from '../API/oktaCalls.mjs';
import * as postmarkCalls from '../API/postmarkCalls.mjs';
import * as knowBe4Calls from '../API/knowBe4.mjs';
import * as atlassianCalls from '../API/atlassianCalls.mjs';
import * as jamfCalls from '../API/jamfCalls.mjs';
import * as googleCalls from '../API/googleCalls.mjs';
import * as jotformCalls from '../API/jotformCalls.mjs';
import { tableQuery } from '../db/db.mjs';
import dotenv from "dotenv";
import { ToadScheduler, SimpleIntervalJob, AsyncTask } from 'toad-scheduler';

const scheduler = new ToadScheduler();
dotenv.config();

// onboard user
export async function onboardUser(user) {
    try {
        // add user to atlassian groups
        let currentEpoch = dateUtils.currentEpoch()
        await atlassianCalls.atlassianAssignUserToGroups(user)

        // activate okta user
        const oktaActivation = await oktaCalls.oktaActivateUser(user)
        console.log('Okta Activation: ', oktaActivation)
        currentEpoch = dateUtils.currentEpoch()

        // take return and get okta activation link to send in email
        await postmarkCalls.sendEmailFromTemplate({
            from: 'employeeonboarding@hover.to',
            to: user.secondary_email,
            templateId: process.env.POSTMARK_ACTIVATION_TEMPLATE,
            templateModel: {
                first_name: user.name.split(' ')[0],
                activationLink: oktaActivation.url
            }
        })

        // swag store points email
        await postmarkCalls.sendEmailFromTemplate({
            from: 'workplace@hover.to',
            to: user.secondary_email,
            templateId: process.env.POSTMARK_SWAG_TEMPLATE,
            templateModel: {
                first_name: user.name.split(' ')[0],
                swag_code: user.swag_code,
                points_code: user.points_code
            }
        })

        // send welcome email
        await postmarkCalls.sendEmailFromTemplate({
            from: 'employeeonboarding@hover.to',
            to: [user.secondary_email, user.hover_email],
            templateId: process.env.POSTMARK_WELCOME_TEMPLATE,
            templateModel: {
                first_name: user.name.split(' ')[0]
            }
        })
    }
    catch(e) {
        console.log('ERROR:', e)
        // alert team that onboarding failed
        await slackCalls.errorSlackMessages(`Onboarding failed for ${user.email}: ${e}`)
    }
}

// onboarding webhook processing
export async function onboardingWebhook(req, res) {
    try {
        // setup slack onbaording team members slack IDs array
        const slackOnboardingTeam = ['UN932C8UX', 'U0335HE53TM', 'U0206JY8KNE', 'U02D8RKKUD8', 'U04TK5RA9HT', 'U01TZFHTCLW']
        // parse hook data
        const { "Full Name": name, "Personal Email": personalEmail, "Okta Email": hoverEmail, "Manager": managerName, "Managers Email": managerEmail, "Start Date": startDate, "Job Title": jobTitle,  Location: location, "Is Manager": isManager, "Employment Status": employmentStatus  } = req.body;
        console.log(name, personalEmail, hoverEmail, managerName, managerEmail, startDate, jobTitle, location, isManager, employmentStatus)

        // create user object
        const user = {
            name: name,
            personal_email: personalEmail,
            hover_email: hoverEmail,
            manager_name: managerName,
            start_date: startDate,
            job_title: jobTitle,
            location: location,
            is_manager: isManager,
            manager_email: managerEmail,
            employment_status: employmentStatus
        }

        // create google account and return ID
        const googleUser = googleCalls.createGoogleUser(user)
        console.log('Google User:', googleUser.id)

        // lookup manager info in google to get IDs
        const managerGoogle = await googleCalls.getUserByEmail(managerEmail)
        const managerGoogleID = managerGoogle.id

        // lookup manager is slack to get ID
        const managerSlack = await slackCalls.getUserByEmail(managerEmail)
        const managerSlackID = managerSlack.id
        slackOnboardingTeam.push(managerSlackID)


        // create ticket in Jira and get ID/ KEY
        const ticketInfo = {
            fields: {
                project: {
                    key: 'IT-HELP',
                },
                summary: `Onboarding - ${hoverEmail}`,
                description: `Onboaring request for ${hoverEmail} \n Manager: ${managerEmail} \n Location: ${location} \n Termination Date: ${term_date} \n Termination Type: ${term_type} \n Manager: ${managerName} \n Address: ${streetAddress} ${streetAddress2} ${city}, ${state} ${zip}`,
                issuetype: {
                    name: 'Serive Request',
                },
            },
        };
        const ticket = await atlassianCalls.atlassianCreateTicket(ticketInfo)
        const ticket_id = ticket.id

        // create slack channel and populate with users
        const slackChannel = await slackCalls.createSlackChannel(user)
        console.log('Slack Channel:', slackChannel.id)
        const slackInvite = await slackCalls.inviteToChannel(slackChannel.id, slackOnboardingTeam)
        console.log('Slack Invite:', slackInvite)

        // send slack message to manager for user cloning
        const slackMessage = `@${managerSlackID} Please choose the user to clone for ${hoverEmail} access into all necessary systems.`
        
        // send postmark welcome email

        // Add user info to database
        const queryValues = [name, hoverEmail, jobTitle, startDate, employmentStatus, managerName, managerEmail, isManager, location, googleUser.id, ticket_id, personalEmail, slackChannel];
        const query = 'INSERT into onboarding(name, email, user_role, start_date, employee_status, user_manager_name, user_manager_email, user_is_manager, location, google_id, jira_ticket_key, secondary_email, slack_channel) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *';
        const result = await tableQuery(query, queryValues);
        const data = result.rows;
        return data

    } catch (e) {
        console.log('ERROR:', e)
    }
}

// onboarding users endpoint
export async function onboardingUsers() {
    try {
        const query = 'SELECT * FROM onboarding WHERE start_date >= CURRENT_DATE ORDER BY start_date ASC';
        const result = await tableQuery(query)
        const data = result.rows.map((user) => {
            return {
                name: user.name,
                email: user.email,
                user_role: user.user_role,
                start_date: user.start_date,
                employee_status: user.employee_status,
                user_manager_name: user.user_manager_name,
                user_manager_email: user.user_manager_email,
                user_is_manager: user.user_is_manager,
                location: user.location,
                google_id: user.google_id,
                jira_ticket_key: user.jira_ticket_key,
                secondary_email: user.secondary_email,
                slack_channel: user.slack_channel
            }
        })
        return data
    } catch (e) {
        console.log('ERROR:', e)
    }
}

// daily runs
export async function dailyOnboardingRuns() {
    try {
        // get all users that are future start date
        const today = dateUtils.currentDate()
        const query = 'SELECT * FROM onboarding WHERE start_date = $1';
        const queryValues = [today]
        const result = await tableQuery(query, queryValues)
        const data = result.rows
        data.forEach(async (user) => {
            // get number of days difference
            const userEpoch = dateUtils.getEpochFromDate(user.start_date)
            const numberOfDays = dateUtils.nbDays(userEpoch)
            console.log('Number of Days:', numberOfDays)

            // if 14 days see if we can get an oktaID and write to db
            if (numberOfDays == 14) {
                // lookup user in okta
                const oktaUser = await oktaCalls.oktaFindUser(user)
                console.log('Okta User:', oktaUser)
                if (oktaUser == 'No User Found') {
                    // send slack message to onboarding team
                    const messageBlocks = [
                        {
                            "type": "section",
                            "text": {
                                "type": "mrkdwn",
                                "text": `:warning: *${user.name}* is starting in 14 days and no Okta user was found. Please investigate.`
                            }
                        }
                    ]
                    await slackCalls.postToChannel(process.env.SLACK_LCM_ALERTS_CHANNEL, messageBlocks)
                } else {
                    // update user record with okta ID
                    const queryValues = [oktaUser.id, user.email];
                    const query = 'UPDATE onboarding SET okta_id = $1 WHERE email = $2';
                    await tableQuery(query, queryValues);
                }
            }
            // check for google ID and create user if not found
            else if (numberOfDays == 12 && user.google_id == null) {
                // create google account and return ID
                const googleUser = googleCalls.createGoogleUser(user)
                console.log('Google User:', googleUser.id)

                // add new google user to onboarding cal events

                // update user record with google ID
                const queryValues = [googleUser.id, user.email];
                const query = 'UPDATE onboarding SET google_id = $1 WHERE email = $2';
                await tableQuery(query, queryValues);
            }
            // if 8 days, check for laptop form completion
            else if (numberOfDays == 8) {
                // lookup submissions in jotform
                const submission = await jotformSubmissionCheck(user)
                if (submission) {
                    // log that submission was found
                    console.log('Laptop Form Submission Found and Added to db')
                } else {
                    // send slack message to onboarding team
                    const messageBlocks = [
                        {
                            "type": "section",
                            "text": {
                                "type": "mrkdwn",
                                "text": `:warning: *${user.name}* is starting in 8 days and no laptop form submission was found. Please investigate.`
                            }
                        }
                    ]
                    await slackCalls.postToChannel(user.slack_channel, messageBlocks)
                }
            }
            // if 1 day, onboard user
            else if (numberOfDays == 1) {
                // start onboarding
                await onboardUser(user)
            }
        });
    } catch (e) {
        console.log('ERROR:', e)
        // alert team that daily onboarding runs failed
        await slackCalls.errorSlackMessages(`Daily Onboarding Runs failed: ${e}`)
    }
}

// check for jotform submission and match email to user
export async function jotformSubmissionCheck(user) {
    try {
        // lookup submissions in jotform
        const submissions = await jotformCalls.jotformGetSubmissions()
        console.log('Jotform Submissions:', submissions)
        // for each submission, check for user email
        submissions.content.forEach(async (submission) => {
            if (submission.answers[3].answer == user.secondary_email) {
                // get submission info
                const submissionInfo = {
                    answers: submission.answers,
                    submission_id: submission.id,
                    submission_time: submission.created_at
                }
                const userAddressStreet = submissionInfo.answers[4].answer.addr_line1
                const userAddressStreet1 = submissionInfo.answers[4].answer.addr_line2 || null
                const userAddressCity = submissionInfo.answers[4].answer.city
                const userAddressState = submissionInfo.answers[4].answer.state
                const userAddressZip = submissionInfo.answers[4].answer.postal
                const userPhone = submissionInfo.answers[5].answer.full
                const userGitName = submissionInfo.answers[7].answer || null
                // add submitted info to db
                const queryValues = [user.hover_email, userAddressStreet, userAddressStreet1, userAddressCity, userAddressState, userAddressZip, userPhone, userGitName];
                const query = 'UPDATE onboarding SET user_address_street = $2, user_address_street1 = $3, user_address_city = $4, user_address_state = $5, user_address_zip = $6, github_username = $7 WHERE hover_email = $1';
                await tableQuery(query, queryValues);
                // slack alert for IT that we can send machine
                const messageBlocks = [
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": `:white_check_mark: *${user.name}* has completed their laptop form and a deviec can be shipped: \n Address: ${userAddressStreet} \n Address2: ${userAddressStreet1} \n City: ${userAddressCity}, ${userAddressState} ${userAddressZip} \n Phone: ${userPhone} \n Github: ${userGitName}`
                        }
                    }
                ]
                await slackCalls.postToChannel(process.env.SLACK_LCM_ALERTS_CHANNEL, messageBlocks)
                return true
            }
            return false
        });
    } catch (e) {
        console.log('ERROR:', e)
        // alert team that jotform submission check failed
        await slackCalls.errorSlackMessages(`Jotform Submission Check failed: ${e}`)
    }
}
