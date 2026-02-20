import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Candidate from './models/Candidate.js'; // Ensure this path matches your structure

dotenv.config();

const clearCandidates = async () => {
  try {
    // 1. Connect to Database
    const conn = await mongoose.connect(process.env.MONGO_URL);
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // 2. Delete All Candidates
    // deleteMany() with an empty object {} selects all documents
    await Candidate.deleteMany({});
    
    console.log('All Candidates removed successfully!');
    process.exit();
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};


clearCandidates();