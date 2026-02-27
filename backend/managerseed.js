import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js'; 

dotenv.config();

const seedData = async () => {
  try {
    // 1️⃣ Connect to MongoDB
    const conn = await mongoose.connect(process.env.MONGO_URL);
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    const users = [
      {
        username: 'nainika@gmail.com',
        // 🔴 FIXED: Split name into firstName and lastName to match User.js
        firstName: 'Nainika',
        lastName: 'Shantholla',
        role: 'manager',
        email: 'shanthollanainika@gmail.com',
        active: true,
        // (Note: You can leave password out of MongoDB entirely now, 
        // because Firebase handles the password!)
      },
    ];

    // 3️⃣ Create Users
    await User.create(users);

    console.log('Manager Seeded Successfully into MongoDB!');
    process.exit();
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

seedData();