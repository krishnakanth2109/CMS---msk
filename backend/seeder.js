import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js'; // Ensure this path matches your structure

dotenv.config();

const seedData = async () => {
  try {
    // 1. Connect to Database
    const conn = await mongoose.connect(process.env.MONGO_URL);
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // 2. Clear existing users to avoid duplicates
    await User.deleteMany();
    console.log('Existing users removed');

    // 3. Define Users
    const users = [
      {
        username: 'sivaprasannagorla@gmail.com',
        password: '987654321', // Middleware in User.js will hash this
        name: 'Sanjay',
        role: 'admin',
        email:"sivaprasannagorla@gmail.com"
      },
      {
        username: 'kkanth355@gmail.com',
        password: '123456789', // Middleware in User.js will hash this
        name: 'Navya ',
        role: 'admin',
        email:"kkanth355@gmail.com"
      },
    ];

    // 4. Create Users
    // We use create() instead of insertMany() to ensure the pre-save hook 
    // in your User model runs to hash the passwords.
    await User.create(users);

    console.log('Data Imported Successfully!');
    process.exit();
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

seedData();