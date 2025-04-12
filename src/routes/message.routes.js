const express = require('express');
const router = express.Router();

// TODO: Add message routes here
router.get('/', (req, res) => {
  res.json({ message: 'Message routes working' });
});

module.exports = router; 