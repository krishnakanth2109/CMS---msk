import mongoose from 'mongoose';

const MONGO_URL = "mongodb+srv://CMS_user:cms1234@cms.92m1yu0.mongodb.net/?appName=CMS";

async function main() {
  await mongoose.connect(MONGO_URL);
  const db = mongoose.connection.db;
  const dbName = db.databaseName;
  console.log("Connected to database:", dbName);

  const col = db.collection('interview_sessions');
  
  // Count stress bot entries
  const botCount = await col.countDocuments({ candidate_name: /STRESSBOT/i });
  const totalBefore = await col.countDocuments();
  console.log(`Total: ${totalBefore}, STRESSBOT: ${botCount}`);
  
  // Delete ALL stress bot entries  
  if (botCount > 0) {
    const result = await col.deleteMany({ candidate_name: /STRESSBOT/i });
    console.log(`Deleted ${result.deletedCount} STRESSBOT entries`);
  }

  // Also delete entries with null created_by that have no real data
  const nullCreator = await col.deleteMany({ created_by: null });
  console.log(`Deleted ${nullCreator.deletedCount} null-creator entries`);

  const totalAfter = await col.countDocuments();
  console.log(`Remaining: ${totalAfter} sessions`);

  // Show what's left
  const remaining = await col.find({}).limit(10).toArray();
  remaining.forEach(s => {
    console.log(`  ${s.candidate_name} | by: ${s.created_by} | status: ${s.status}`);
  });

  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
