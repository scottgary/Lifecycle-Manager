import dotenv from 'dotenv';
import * as offboarding from './Offboarding/offboarding.mjs';
import * as onboarding from './Onboarding/onboarding.mjs';
import * as allHover from './allEmployees.mjs';
import {express,  request } from 'express';
import passport from 'passport'; // SSO Support
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path'; // Importing the join function from the path module
import { Strategy as SamlStrategy } from 'passport-saml';
import bodyParser from 'body-parser';
import { ToadScheduler, SimpleIntervalJob, AsyncTask } from 'toad-scheduler';
import * as routes from './routes/routes.mjs';
import { authCheck } from './workers/webhookAuth.mjs';
import * as webhooks from './workers/webhooks.mjs';
import { tableQuery } from './db/db.mjs';

dotenv.config();
const scheduler = new ToadScheduler();
const app = express();
app.use(bodyParser.json());

app.set("view engine", "ejs")

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Serve static files from the 'src' directory
// app.use(express.static(join(__dirname, 'src')));

app.use(express.static(join(__dirname, 'src'), {
  setHeaders: (res, filePath) => {
      if (filePath.endsWith('.js')) {
          res.setHeader('Content-Type', 'text/javascript');
      }
  }
}));


// SSO config for SSO support

// okta cert
// const cert = fs.readFileSync('./config/okta.cert', 'utf-8');

// // setup passport saml strategy
// // Configure Passport with SAML strategy
// passport.use(new SamlStrategy({
//   // SAML configuration options for Okta
//   entryPoint: '',
//   issuer: '',
//   callbackUrl: '', // Redirect URL after authentication
//   cert: cert,
// }, (profile, done) => {
//   // This callback is triggered after successful authentication
//   return done(null, profile);
// }));

// Endpoint for initiating SAML authentication
// app.post('/login',
//     passport.authenticate('saml', { session: false })
// );

// // Callback endpoint for handling authentication response
// app.post('/login/callback',
//     passport.authenticate('saml', { session: false }),
//     (req, res) => {
//         // Redirect or respond with success message
//         res.redirect('/');
//     }
// );

// Webhook auth tokens
const onboardingToken = process.env.WEBHOOK_ONBOARDING_AUTH_TOKEN
const offboardingToken = process.env.WEBHOOK_OFFBOARDING_AUTH_TOKEN
const contractorToken = process.env.WEBHOOK_CONTRACTORS_AUTH_TOKEN

// offboarding webhook
app.post('api/v1/offboarding/webhook', authCheck, async (req, res) => {
    try {
        // match auth token
        requestToken = req.headers['authorization']
        if (requestToken !== offboardingToken) {
            res.status(401).send('Unauthorized')
            return
        }
        // parse hook data
        const response = await offboarding.offboardingWebhook(req, res);
        console.log('Response:', response);
        
        // send ok message
        res.status(200).send('OK');
    } catch (err) {
        console.error('Error Parsing Hook', err);
        res.status(500).send('Internal Server Error');
    }
});

// onboarding webhook
app.post('api/v1/onboarding/webhook', authCheck, async (req, res) => {
    try {
        // match auth token
        requestToken = req.headers['authorization']
        if (requestToken !== onboardingToken) {
            res.status(401).send('Unauthorized')
            return
        }

        // parse hook data
        const response = await onboarding.onboardingWebhook(req, res);
        console.log('Response:', response);

        // send ok message
        res.status(200).send('OK');
    } catch (err) {
        console.error('Error executing SQL', err);
        res.status(500).send('Internal Server Error');
    }
});

// onboarding import webhook
app.post('api/v1/onboarding/import/webhook', authCheck, async (req, res) => {
    try {
        // match auth token
        requestToken = req.headers['authorization']
        if (requestToken !== onboardingToken) {
            res.status(401).send('Unauthorized')
            return
        }

        // parse hook data
        const response = await onboarding.onboardingImportWebhook(req, res);
        console.log('Response:', response);

        // send ok message
        res.status(200).send('OK');
    } catch (err) {
        console.error('Error executing SQL', err);
        res.status(500).send('Internal Server Error');
    }
});

// contractors webhook
app.post('api/v1/contractors/webhook', authCheck, async (req, res) => {
    try {
        // match auth token
        requestToken = req.headers['authorization']
        if (requestToken !== contractorToken) {
            res.status(401).send('Unauthorized')
            return
        }

        // parse hook data
        const response = await contractors.contractorsWebhook(req, res);
        console.log('Response:', response);

        // send ok message
        res.status(200).send('OK');
    } catch (err) {
        console.error('Error executing SQL', err);
        res.status(500).send('Internal Server Error');
    }
});

// offboarding users endpoint
app.get('api/v1/offboarding/users', async (req, res) => {
    try {
        // match auth token
        requestToken = req.headers['authorization']
        if (requestToken !== contractorToken) {
            res.status(401).send('Unauthorized')
            return
        }
        // get offboarding users
        const response = await offboarding.offboardingUsers();
        console.log('Response:', response);
        const data = {
            total: response.length,
            users: response
        }
        // send ok message with data
        res.status(200).send(data);
    } catch (err) {
        console.error('Error: ', err);
        res.status(500).send('Internal Server Error');
    }
});


// onboarding users endpoint
app.get('api/v1/onboarding/users', async (req, res) => {
    try {
        // match auth token
        requestToken = req.headers['authorization']
        if (requestToken !== contractorToken) {
            res.status(401).send('Unauthorized')
            return
        }
        // get onboarding users
        const response = await onboarding.onboardingUsers();
        console.log('Response:', response);
        const data = {
            total: response.length,
            users: response
        }
        // send ok message with data
        res.status(200).send(data);
    } catch (err) {
        console.error('Error: ', err);
        res.status(500).send('Internal Server Error');
    }
});

// all users enpoint
app.get('api/v1/users', async (req, res) => {
    try {
        // match auth token
        requestToken = req.headers['authorization']
        if (requestToken !== contractorToken) {
            res.status(401).send('Unauthorized')
            return
        }
        // get all users
        const response = await allHover.getAllActiveUsers();
        console.log('Response:', response);
        const data = {
            total: response.length,
            users: response
        }
        // send ok message with data
        res.status(200).send(data);
    } catch (err) {
        console.error('Error: ', err);
        res.status(500).send('Internal Server Error');
    }
});

// index route
app.get('/', async (req, res) => {
    console.log('Index route hit');
    const data = await tableQuery('SELECT * FROM active_users');
    res.render('index', { data: data.rows});
});

// user view route
app.get('/users/:id', async (req, res) => {
    console.log('User view route hit');
    const data = await tableQuery(`SELECT * FROM active_users WHERE id = ${req.params.id}`);
    res.render('userView', { data: data.rows});
});

  
// onboarding route
app.get('/onboarding', async (req, res) => {
    console.log('Onboarding route hit');
    const data = await tableQuery('SELECT * FROM onboarding WHERE start_date > NOW()');
    res.render('onboarding', { data: data.rows});
});

// onboarding ID route
app.get('/onboarding/:id', async (req, res) => {
    console.log('Onboarding ID route hit');
    const data = await tableQuery(`SELECT * FROM onboarding WHERE id = ${req.params.id}`);
    res.render('onboardingUserView', { data: data.rows});
}); 

// onbaording import route
app.get('/import', async (req, res) => {
    console.log('Onboarding import route hit');
    const data = await tableQuery('SELECT * FROM onboarding_import');
    res.render('onboardingImport', { data: data.rows});
});

// onboarding import ID route
app.get('/import/:id', async (req, res) => {
    console.log('Onboarding import ID route hit');
    const data = await tableQuery(`SELECT * FROM onboarding_import WHERE id = ${req.params.id}`);
    res.render('onboardingImportUserView', { data: data.rows});
});

// offboarding route
app.get('/offboarding', async (req, res) => {
    console.log('Offboarding route hit');
    const data = await tableQuery('SELECT * FROM offboarding WHERE last_day > NOW()');
    res.render('offboarding', { data: data.rows});
});

// offboarding ID route
app.get('/offboarding/:id', async (req, res) => {
    console.log('Offboarding ID route hit');
    const data = await tableQuery(`SELECT * FROM offboarding WHERE id = ${req.params.id}`);
    res.render('offboardingUserView', { data: data.rows});
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
