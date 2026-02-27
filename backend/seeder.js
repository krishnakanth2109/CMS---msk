import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js'; // Make sure this path is correct

dotenv.config();

const seedData = async () => {
  try {
    // 1️⃣ Connect to MongoDB
    const conn = await mongoose.connect(process.env.MONGO_URL);
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // 2️⃣ Define Users (No deleteMany — existing users will remain)

    const users = [
      // 🔹 Recruiter User
      // {
      //   username: 'urstruelykrishnkanth@gmail.com',
      //   password: '987654321', // Will be hashed by pre-save middleware
      //   name: 'Mahesh',
      //   role: 'recruiter',
      //   email: 'urstruelykrishnkanth@gmail.com',
      // },

      // 🔹 Admin User
      // {
      //   username: 'kkanth355@gmail.com',
      //   password: '123456789', // Will be hashed by pre-save middleware
      //   name: 'Navya',
      //   role: 'admin',
      //   email: 'kkanth355@gmail.com',
      // },

      // 🔹 Manager User (New Role Added)
      {
        username: 'nainika@gmail.com',
        password: '123456789', // Will be hashed by pre-save middleware
        name: 'Nainika Shantholla',
        role: 'manager',
        email: 'Shanthollanainika@gmail.com',
      },
    ];

    // 3️⃣ Create Users
    // Using create() so that pre-save middleware runs (password hashing)
    await User.create(users);

    console.log('Users Seeded Successfully!');
    process.exit();
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

seedData();