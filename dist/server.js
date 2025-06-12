import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
// Load environment variables from .env file
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;
// Middleware
app.use(express.json());
app.use(cors()); // Enable CORS for cross-origin requests
// Basic route to test the server
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to Afrodoctor Backend API' });
});
// Start the server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
