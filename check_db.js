import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './backend/models/User.js';
import Candidate from './backend/models/Candidate.js';

dotenv.config({ path: './backend/.env' });

async function checkDB() {
    try {
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
