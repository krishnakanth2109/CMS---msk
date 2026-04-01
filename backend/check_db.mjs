import mongoose from 'mongoose';

const MONGO_URL = "mongodb+srv://CMS_user:cms1234@cms.92m1yu0.mongodb.net/?appName=CMS";

async function main() {
  await mongoose.connect(MONGO_URL);
  const db = mongoose.connection.db;
  const col = db.collection('interview_sessions');

  const total = await col.countDocuments();
  console.log("Total interview_sessions documents:", total);

  // Group by created_by to see who created sessions
  const creators = await col.aggregate([
    { $group: { _id: "$created_by", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 15 }
  ]).toArray();
  console.log("\nSessions grouped by created_by:");
  creators.forEach(c => console.log(`  ${c._id} => ${c.count} sessions`));

  // Show a sample of non-stress-bot entries
  const realSessions = await col.find({
    candidate_name: { $not: /STRESSBOT/i }
  }).sort({ created_at: -1 }).limit(5).toArray();

  console.log("\nRecent non-STRESSBOT sessions:");
  realSessions.forEach(s => {
    console.log(`  Name: ${s.candidate_name} | Created by: ${s.created_by} (${s.created_by_name || 'N/A'}) | Status: ${s.status} | Date: ${s.created_at}`);
  });

  // Count stress bot entries
  const botCount = await col.countDocuments({ candidate_name: /STRESSBOT/i });
  console.log(`\nSTRESSBOT entries: ${botCount} out of ${total} total`);

  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
