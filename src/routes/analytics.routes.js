const express = require('express');
const router = express.Router();

// TODO: Add analytics routes here
router.get('/', (req, res) => {
  res.json({ message: 'Analytics routes working' });
});

module.exports = router; 