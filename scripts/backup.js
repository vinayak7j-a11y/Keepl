require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const date = new Date().toISOString().split('T')[0];
const backupDir = path.join(__dirname, '../backups', date);

async function backup() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB');

  const collections = await mongoose.connection.db.listCollections().toArray();
  fs.mkdirSync(backupDir, { recursive: true });

  for(const col of collections) {
    const data = await mongoose.connection.db.collection(col.name).find({}).toArray();
    fs.writeFileSync(
      path.join(backupDir, `${col.name}.json`),
      JSON.stringify(data, null, 2)
    );
    console.log(`✅ Backed up ${col.name} — ${data.length} records`);
  }

  await mongoose.disconnect();
  console.log(`\n✅ Backup complete → ./backups/${date}/`);
}

backup().catch(err => {
  console.error('❌ Backup failed:', err.message);
  process.exit(1);
});
