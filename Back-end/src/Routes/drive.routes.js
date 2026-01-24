const express = require('express');
const multer = require('multer');

const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const {
  getAuthUrl,
  oauthCallback,
  status,
  disconnect,
  filesList,
  folderCreate,
  fileUpload,
  fileDownload,
  itemRename,
  itemDelete,
  itemShare,
  permissionsList,
  permissionRemove,
} = require('../Controllers/drive.controller');

const upload = multer({ storage: multer.memoryStorage() });

router.get('/auth-url', protect, getAuthUrl);
router.get('/oauth2callback', oauthCallback);

router.get('/status', protect, status);
router.post('/disconnect', protect, disconnect);
router.get('/files', protect, filesList);
router.post('/folders', protect, folderCreate);
router.post('/upload', protect, upload.array('file', 20), fileUpload);
router.get('/download/:fileId', protect, fileDownload);

router.patch('/files/:fileId', protect, itemRename);
router.post('/files/:fileId/rename', protect, itemRename);
router.delete('/files/:fileId', protect, itemDelete);
router.post('/files/:fileId/share', protect, itemShare);

router.get('/files/:fileId/permissions', protect, permissionsList);
router.delete('/files/:fileId/permissions/:permissionId', protect, permissionRemove);

module.exports = router;
