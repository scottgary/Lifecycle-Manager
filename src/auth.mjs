import dotenv from 'dotenv';

dotenv.config();

// Middleware to authenticate API keys
export const authenticateAPIKey = (req, res, next) => {
    const apiKey = req.headers['api-key'];
    if (!apiKey) {
      return res.status(401).json({ message: 'API Key is required' });
    }
  
    // Check the API key against the env
    if (apiKey !== process.env.API_KEY) {
        return res.status(403).json({ message: 'Invalid API Key' });
    } 
    // Valid API key, proceed to the next middleware
    next();
  };