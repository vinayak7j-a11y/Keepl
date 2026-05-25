require('dotenv').config();
const { exec } = require('child_process');
const date = new Date().toISOString().split('T')[0];

exec(`mongodump --uri="${process.env.MONGO_URI}" --out=./backups/${date}`, (err) => {
  if(err) {
    console.error('❌ Backup failed:', err.message);
    return;
  }
  console.log(`✅ Backup saved to ./backups/${date}`);
});
