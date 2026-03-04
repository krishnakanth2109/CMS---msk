import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

const seedData = async () => {
  try {
    // 1️⃣ Connect to MongoDB
    const conn = await mongoose.connect(process.env.MONGO_URL);
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // 2️⃣ Define Users
    const users = [
      {
        username: 'Krishna Kanth',
        password: '123456789',
        name: 'Krishna Kanth',
        role: 'manager', 
        email: 'kkanth355@gmail.com',
      },
      {
        username: 'Sanjay',
        password: '123456789',
        name: 'Sanjay',
        role: 'manager',
        email: 'ops@vagarioussolutions.com',
      },
      {
        username: 'Navya',
        password: '123456789',
        name: 'Navya',
        role: 'manager',
        email: 'navya@vagarioussolutions.com',
      },
      {
        username: 'Santholla Naininka',
        password: '123456789',
        name: 'Nainika Shantholla',
        role: 'admin',
        email: 'nainika@vagarioussolutions.com',
      },
    ];

    // 3️⃣ Upsert Users (Update if exists, Create if not)
    // This prevents the "Duplicate Key" error
    console.log('Syncing users...');
    
    for (const userData of users) {
      await User.findOneAndUpdate(
        { email: userData.email }, // Find user by email
        userData,                 // Update with this data
        { 
          upsert: true,           // Create if not found
          new: true,              // Return the updated doc
          runValidators: true,
          setDefaultsOnInsert: true 
        }
      );
      console.log(`Synced user: ${userData.email} as ${userData.role}`);
    }

    console.log('✅ Users Seeded/Updated Successfully!');
    process.exit();
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
};

seedData();