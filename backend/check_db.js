import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Candidate from './models/Candidate.js';

dotenv.config();

async function checkDB() {
    try {
        console.log('Connecting to MONGO_URL:', process.env.MONGO_URL);
        await mongoose.connect(process.env.MONGO_URL);
        console.log('Connected to MongoDB');
        
        const userCount = await User.countDocuments();
        const recruiters = await User.find({ role: { $in: ['recruiter', 'admin'] } });
        const candidateCount = await Candidate.countDocuments();
        
        console.log(`Total users in DB: ${userCount}`);
        console.log(`Recruiters/Admins found: ${recruiters.length}`);
        console.log(`Total candidates in DB: ${candidateCount}`);
        
        recruiters.forEach(r => {
            console.log(`- ${r.firstName} ${r.lastName} (${r.role}) active: ${r.active}`);
        });

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkDB();
