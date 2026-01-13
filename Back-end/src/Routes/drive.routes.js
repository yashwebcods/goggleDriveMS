const express = require('express');
const multer = require('multer');

const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const {
  getAuthUrl,
  oauthCallback,
  status,
  filesList,
  folderCreate,
  fileUpload,
  fileDownload,
} = require('../Controllers/drive.controller');

const upload = multer({ storage: multer.memoryStorage() });

router.get('/auth-url', protect, getAuthUrl);
router.get('/oauth2callback', oauthCallback);

router.get('/status', protect, status);
router.get('/files', protect, filesList);
router.post('/folders', protect, folderCreate);
router.post('/upload', protect, upload.single('file'), fileUpload);
router.get('/download/:fileId', protect, fileDownload);

module.exports = router;
