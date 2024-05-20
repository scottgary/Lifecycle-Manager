import pkg from '@okta/okta-sdk-nodejs';
const { Client: OktaClient } = pkg;
import { errorSlackMessages } from './slackCalls.mjs';
import dotenv from "dotenv";
dotenv.config();

const client = new OktaClient({
  orgUrl: process.env.OKTA_URL,
  token: process.env.OKTA_TOKEN
});

///////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////// General //////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////

// Find user and return info 
export async function oktaFindUser(user) {
    try {
        userInfo = await client.userApi.getUser({ userId: user.email });
        console.log('User Lookup: ', userInfo);
        if (userInfo == ''){
            console.log('No User Found');
            return 'No User Found'

        }
        else {
            return userInfo
        }             
    }
    catch(e) {
        console.log('ERROR:', e)
        errorSlackMessages(`Okta User Lookup failed: \n${e}`)
        return e
    }
}

export async function oktaGetAllUsers() {
    try {
        const results = []
        const url = `${client.baseUrl}/api/v1/users?search=status+eq+%22ACTIVE%22`;
        const request = {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        }
        };

        const response = await client.http.http(url, request)
        const data = await response.json()
        data.users.forEach(user => {
            results.push(user)
        })
        while (data.nextPage) {
            const response = await client.http.http(data.nextPage, request)
            const data = await response.json()
            data.users.forEach(user => {
                results.push(user)
            })
        }
        return results
    }
    catch(e) {
        console.log('ERROR:', e)
        errorSlackMessages(`Okta User Lookup failed: \n${e}`)
        return e
    
    }
}

///////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////// Onboarding ///////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////

// Activate User
export async function oktaActivateUser(user) {
    try {
        const userId = user.okta_id
        // example response from setting email to false
        // {
        //     "activationUrl": "https://{yourOktaDomain}/welcome/XE6wE17zmphl3KqAPFxO",
        //     "activationToken": "XE6wE17zmphl3KqAPFxO"
        // }
        const url = `${client.baseUrl}/api/v1/users/${userId}/lifecycle/activate?sendEmail=false`; // sendEmail=false means we need a postmark email to send instead
        const request = {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        }
        };
        var response = client.http.http(url, request)
        .then(res => res.text())
        .then(text => {
            console.log(text);
        })
        .catch(err => {
            console.error(err);
        });
        return response

    }
    catch(e) {
        console.log('ERROR:', e)
        errorSlackMessages(`Okta User Activation failed: \n${e}`)
        return e
    }
}

// Create User
export async function oktaCreateUser(user) {
    try {
        const newUser = {
            profile: {
                firstName: user.first_name,
                lastName: user.last_name,
                email: user.email,
                login: user.email,
                mobilePhone: user.phone,
                userType: 'EXTERNAL',
                credentials: {
                    password: {
                        value: user.password
                    }
                }
            }
        };
        var response = client.createUser(newUser)
        .then(res => res.text())
        .then(text => {
            console.log(text);
        })
        .catch(err => {
            console.error(err);
        });
        return response

    }
    catch(e) {
        console.log('ERROR:', e)
        errorSlackMessages(`Okta User Creation failed: \n${e}`)
        return e
    }
}

///////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////// OffBoarding //////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////

// Deactivate User
export async function oktaDeactivateUser(user) {
    try {
        const userId = user.okta_id
        const url = `${client.baseUrl}/api/v1/users/${userId}/lifecycle/deactivate`;
        const request = {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        }
        };

        var response = client.http.http(url, request)
        .then(res => res.text())
        .then(text => {
            console.log(text);
        })
        .catch(err => {
            console.error(err);
        });
        return response

    }
    catch(e) {
        console.log('ERROR:', e)
        errorSlackMessages(`Okta User Deactivation failed: \n${e}`)
        return e
    }
}

// Suspend User
export async function oktaSuspendUser(user) {
    try {
        const userId = user.okta_id
        const url = `${client.baseUrl}/api/v1/users/${userId}/lifecycle/suspend`;
        const request = {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        }
        };

        var response = client.http.http(url, request)
        .then(res => res.text())
        .then(text => {
            console.log(text);
        })
        .catch(err => {
            console.error(err);
        });
        return response

    }
    catch(e) {
        console.log('ERROR:', e)
        errorSlackMessages(`Okta User Suspension failed: \n${e}`)
        return e
    }
}

// Clear User Sessions
export async function oktaClearUserSessions(user) {
    try {
        const userId = user.okta_id
        const url = `${client.baseUrl}/api/v1/users/${userId}/sessions`;
        const request = {
        method: 'DELETE',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        }
        };

        var response = client.http.http(url, request)
        .then(res => res.text())
        .then(text => {
            console.log(text);
        })
        .catch(err => {
            console.error(err);
        });
        return response

    }
    catch(e) {
        console.log('ERROR:', e)
        errorSlackMessages(`Okta User Session Clear failed: \n${e}`)
        return e
    }
}

