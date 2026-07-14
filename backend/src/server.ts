import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db';
import authRoutes from './routes/auth';
import flowchartRoutes from './routes/flowcharts';

// Load environmental variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173'], // Frontend dev server address
  credentials: true
}));
app.use(express.json({ limit: '10mb' })); // Support larger diagram files if necessary

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/flowcharts', flowchartRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// Start DB & Express Server
async function startServer() {
  await connectDB();
  
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}

startServer();
