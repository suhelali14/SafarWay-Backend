const fs = require('fs');
const path = require('path');

const initializeApp = () => {
  // Create uploads directory if it doesn't exist
  const uploadsDir = path.join(__dirname, '../../uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('Created uploads directory');
  }

  // Create .gitkeep file to preserve empty directory
  const gitkeepPath = path.join(uploadsDir, '.gitkeep');
  if (!fs.existsSync(gitkeepPath)) {
    fs.writeFileSync(gitkeepPath, '');
    console.log('Created .gitkeep file in uploads directory');
  }
};

module.exports = initializeApp; 