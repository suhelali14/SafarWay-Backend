const express = require('express');
const router = express.Router();

// TODO: Add tour routes here
router.get('/', (req, res) => {
  res.json({ message: 'Tour routes working' });
});

module.exports = router; 