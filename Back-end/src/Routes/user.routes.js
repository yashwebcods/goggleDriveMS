const express = require('express');

const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const { listUsers } = require('../Controllers/user.controller');

router.get('/', protect, listUsers);

module.exports = router;
