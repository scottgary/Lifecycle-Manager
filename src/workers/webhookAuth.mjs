import dotenv from 'dotenv';
dotenv.config();

export async function authCheck(req, res, next) {
    if (req.headers['authorization'] === `Bearer ${process.env.WEBHOOK_JIRA_AUTH_TOKEN}`) {
        next();
    } else {
        res.status(401).send('Unauthorized');
    }
}
