const express = require('express');
const router = express.Router();
const { searchPackages } = require('../controllers/package.controller');

// Search packages endpoint
router.get('/packages', searchPackages);

module.exports = router; 