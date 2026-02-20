import 'dotenv/config'; // <--- CRITICAL FIX: Loads .env BEFORE imports

import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Routes (Now it's safe to import these because .env is already loaded)
import authRoutes from './routes/authRoutes.js';
import recruiterRoutes from './routes/recruiterRoutes.js';
import candidateRoutes from './routes/candidateRoutes.js';
import clientRoutes from './routes/clientRoutes.js';
import jobRoutes from './routes/jobRoutes.js';
import interviewRoutes from './routes/interviewRoutes.js';
import messageRoutes from './routes/messageRoutes.js';

// Fix for __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const app = express();
const httpServer = createServer(app);

// Initialize Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: [
      'https://cms-vagarious.netlify.app',
      'http://localhost:5173',
      'http://localhost:5000',
      'http://localhost:8080',
      'https://vagarious-cms.netlify.app'
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: [
    'https://cms-vagarious.netlify.app',
    'http://localhost:5173',
    'http://localhost:5000',
    'http://localhost:8080',
    'http://127.0.0.1:8080'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// --- CRITICAL FIX: Increased Limit for Image/File Uploads ---
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// --- Serve Uploaded Files Statically ---
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Database Connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log('MongoDB Connected');
  } catch (error) {
    console.error('Database connection error:', error.message);
    process.exit(1);
  }
};
connectDB();

// --- Socket.IO Logic ---
io.on('connection', (socket) => {
  console.log(`⚡ Socket Connected: ${socket.id}`);

  socket.on('join_room', (userId) => {
    if (userId) {
      socket.join(userId);
      console.log(`👤 User joined room: ${userId}`);
    }
  });

  socket.on('send_message', (data) => {
    if (data.to === 'all') {
      socket.broadcast.emit('receive_message', data);
    } else {
      socket.to(data.to).emit('receive_message', data);
    }
  });

  socket.on('disconnect', () => {
    // console.log('Socket Disconnected', socket.id);
  });
});

// --- Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/recruiters', recruiterRoutes);
app.use('/api/candidates', candidateRoutes); // This route will handle the upload
app.use('/api/clients', clientRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/messages', messageRoutes);

// Fallback Routes (for legacy support if needed)
app.use('/auth', authRoutes);
app.use('/recruiters', recruiterRoutes);
app.use('/candidates', candidateRoutes);
app.use('/clients', clientRoutes);
app.use('/jobs', jobRoutes);
app.use('/interviews', interviewRoutes);
app.use('/messages', messageRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'API is running with Socket.IO & File Uploads...' });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error("Server Error Log:", err.stack);
  res.status(500).json({ error: 'Internal Server Error', details: err.message });
});

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔌 Socket.IO initialized`);
});
