// seed.js
import mongoose from 'mongoose';
import XLSX from 'xlsx';
import fs from 'fs';
import dotenv from 'dotenv';
import Candidate from './models/Candidate.js';
import User from './models/User.js';

dotenv.config();

// ============ CONFIGURATION ============
const MONGODB_URI = process.env.MONGO_URL || 'mongodb://localhost:27017/your-database';
const EXCEL_FILE_PATH = './Submissions.xlsx';
const RECRUITER_EMAIL = 'varun.vagarioussolutions@gmail.com';

// ============ CONNECT TO DATABASE ============
const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    process.exit(1);
  }
};

// ============ GET VARUN AS RECRUITER ============
const getRecruiter = async () => {
  try {
    const recruiter = await User.findOne({ email: RECRUITER_EMAIL });
    
    if (!recruiter) {
      throw new Error(`Recruiter not found with email: ${RECRUITER_EMAIL}`);
    }

    console.log(`✅ Found recruiter: ${recruiter.name} (${recruiter.email})`);
    return {
      id: recruiter._id,
      name: recruiter.name
    };
  } catch (error) {
    console.error('❌ Error getting recruiter:', error.message);
    throw error;
  }
};

// ============ READ EXCEL FILE (TRANSPOSE) ============
const readExcelFile = (filePath) => {
  try {
    console.log(`📖 Reading Excel file: ${filePath}`);
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Get range
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    
    // Read data as array of arrays
    const data = [];
    for (let R = range.s.r; R <= range.e.r; ++R) {
      const row = [];
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = worksheet[cellAddress];
        row.push(cell ? cell.v : '');
      }
      data.push(row);
    }

    // First row contains field names, rest are candidate data
    const headers = data[0];
    const candidates = [];

    // Each column (after first) is a candidate
    for (let colIndex = 1; colIndex < data[0].length; colIndex++) {
      const candidate = {};
      for (let rowIndex = 0; rowIndex < headers.length; rowIndex++) {
        const fieldName = headers[rowIndex];
        const fieldValue = data[rowIndex][colIndex];
        if (fieldName && fieldValue) {
          candidate[fieldName] = fieldValue;
        }
      }
      if (Object.keys(candidate).length > 0) {
        candidates.push(candidate);
      }
    }

    console.log(`✅ Read ${candidates.length} candidates from sheet: ${sheetName}`);
    if (candidates.length > 0) {
      console.log(`📋 Fields found: ${Object.keys(candidates[0]).join(', ')}`);
    }
    
    return candidates;
  } catch (error) {
    console.error('❌ Error reading Excel file:', error.message);
    throw error;
  }
};

// ============ MAP EXCEL DATA TO CANDIDATE ============
const mapExcelDataToCandidate = (data, recruiterInfo) => {
  const getValue = (key) => {
    const value = data[key];
    if (value === undefined || value === null || value === '' || value === 'NA' || value === '-') {
      return undefined;
    }
    return String(value).trim();
  };

  const parseSkills = (skillsString) => {
    if (!skillsString) return ['General'];
    return skillsString
      .split(/[,;]/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  };

  // Map Excel fields to candidate schema
  const candidateData = {
    // Personal Info
    name: getValue('NAME') || getValue('Name') || getValue('name') || 'Unknown',
    email: getValue('EMAIL') || getValue('Email') || getValue('email') || `unknown${Date.now()}@example.com`,
    contact: getValue('CONTACT') || getValue('Contact') || getValue('contact') || getValue('PHONE') || getValue('Phone') || 'N/A',
    
    // Professional Info
    position: getValue('POSITION') || getValue('Position') || getValue('position') || getValue('ROLE') || getValue('Role') || 'General',
    skills: parseSkills(getValue('SKILLS') || getValue('Skills') || getValue('skills') || getValue('POSITION') || getValue('Position')),
    client: getValue('CLIENT') || getValue('Client') || getValue('client') || 'General',
    currentCompany: getValue('CURRENT COMPANY') || getValue('Current Company'),
    currentLocation: getValue('CURRENT LOCATION') || getValue('Current Location'),
    preferredLocation: getValue('PREFERRED LOCATION') || getValue('Preferred Location'),
    
    // Status
    status: getValue('STATUS') || getValue('Status') || getValue('status') || 'Submitted',
    
    // Experience & Pay
    totalExperience: getValue('TOTAL EXPERIENCE') || getValue('Total Experience') || getValue('totalExperience') || getValue('EXPERIENCE'),
    relevantExperience: getValue('RELEVANT EXPERIENCE') || getValue('Relevant Experience') || getValue('relevantExperience'),
    ctc: getValue('CTC') || getValue('ctc'),
    ectc: getValue('ECTC') || getValue('ectc') || getValue('EXPECTED CTC'),
    
    // Notice Period
    noticePeriod: getValue('NOTICE PERIOD') || getValue('Notice Period') || getValue('noticePeriod'),
    
    // System
    recruiterId: recruiterInfo.id,
    recruiterName: recruiterInfo.name,
    source: 'Portal',
    rating: 0,
    active: true,
    dateAdded: new Date()
  };

  // Remove undefined fields
  Object.keys(candidateData).forEach(key => {
    if (candidateData[key] === undefined) {
      delete candidateData[key];
    }
  });

  return candidateData;
};

// ============ MAIN SEEDING FUNCTION ============
const seedCandidates = async () => {
  try {
    console.log('🌱 Starting Candidate Seeding Process...\n');

    await connectDB();

    const recruiterInfo = await getRecruiter();
    console.log(`👤 Using recruiter: ${recruiterInfo.name}\n`);

    const excelData = readExcelFile(EXCEL_FILE_PATH);

    if (excelData.length === 0) {
      console.log('⚠️  No data found in Excel file');
      return;
    }

    // Optional: Clear existing candidates for this recruiter
    const clearExisting = false; // Set to true if you want to clear
    if (clearExisting) {
      console.log('🗑️  Clearing existing candidates for this recruiter...');
      await Candidate.deleteMany({ recruiterId: recruiterInfo.id });
      console.log('✅ Existing candidates cleared\n');
    }

    console.log(`📝 Processing ${excelData.length} candidates...\n`);
    
    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (let i = 0; i < excelData.length; i++) {
      const row = excelData[i];
      
      try {
        const candidateData = mapExcelDataToCandidate(row, recruiterInfo);
        
        // Create candidate
        const candidate = new Candidate(candidateData);
        await candidate.save();
        
        successCount++;
        console.log(`✅ [${i + 1}/${excelData.length}] Created: ${candidateData.name} (${candidate.candidateId})`);
      } catch (error) {
        errorCount++;
        const errorMsg = `Row ${i + 1}: ${error.message}`;
        errors.push(errorMsg);
        console.log(`❌ [${i + 1}/${excelData.length}] ${errorMsg}`);
      }
    }

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 SEEDING SUMMARY');
    console.log('='.repeat(80));
    console.log(`✅ Successfully created: ${successCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📋 Total processed: ${excelData.length}`);
    console.log(`👤 All candidates assigned to: ${recruiterInfo.name} (${RECRUITER_EMAIL})`);
    
    if (errors.length > 0 && errors.length <= 10) {
      console.log('\n⚠️  Error Details:');
      errors.forEach(err => console.log(`   - ${err}`));
    } else if (errors.length > 10) {
      console.log(`\n⚠️  First 10 errors:`);
      errors.slice(0, 10).forEach(err => console.log(`   - ${err}`));
      console.log(`   ... and ${errors.length - 10} more errors`);
    }

  } catch (error) {
    console.error('\n❌ Seeding failed:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
    process.exit(0);
  }
};

// Run the seeder
seedCandidates();