const {
  getDriveAuthUrlForUser,
  handleOAuthCallback,
  listFiles,
  createFolder,
  uploadFile,
  renameFile,
  deleteFile,
  shareFile,
  listPermissions,
  removePermission,
  getFileMeta,
  downloadFolderZipStream,
  downloadFileStream,
  getDriveStatus,
} = require('../services/googleDrive.service');

const User = require('../Models/user.model');

const getAuthUrl = async (req, res) => {
  try {
    const url = await getDriveAuthUrlForUser(req.user._id);
    return res.json({ success: true, data: { url } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const itemRename = async (req, res) => {
  try {
    const { fileId } = req.params;
    const { name } = req.body || {};
    if (!name) {
      return res.status(400).json({ success: false, message: 'name is required' });
    }

    const data = await renameFile({ userId: req.user._id, fileId, name });
    return res.json({ success: true, data });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: error.message });
  }
};

const itemDelete = async (req, res) => {
  try {
    const { fileId } = req.params;
    const data = await deleteFile({ userId: req.user._id, fileId });
    return res.json({ success: true, data });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: error.message });
  }
};

const itemShare = async (req, res) => {
  try {
    const { fileId } = req.params;
    const { email, targetUserId, role } = req.body || {};

    let resolvedEmail = email || undefined;

    if (!resolvedEmail && targetUserId) {
      const targetUser = await User.findById(targetUserId).select('email isActive');
      if (!targetUser || !targetUser.email) {
        return res.status(404).json({ success: false, message: 'Target user not found' });
      }
      if (!targetUser.isActive) {
        return res.status(400).json({ success: false, message: 'Target user is not active' });
      }
      resolvedEmail = targetUser.email;
    }

    if (resolvedEmail && String(resolvedEmail).toLowerCase() === String(req.user.email || '').toLowerCase()) {
      return res.status(400).json({ success: false, message: 'You cannot share to yourself' });
    }

    const data = await shareFile({ userId: req.user._id, fileId, email: resolvedEmail, role: role || undefined });
    return res.json({ success: true, data });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: error.message });
  }
};

const permissionsList = async (req, res) => {
  try {
    const { fileId } = req.params;
    const data = await listPermissions({ userId: req.user._id, fileId });
    return res.json({ success: true, data });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: error.message });
  }
};

const permissionRemove = async (req, res) => {
  try {
    const { fileId, permissionId } = req.params;
    const data = await removePermission({ userId: req.user._id, fileId, permissionId });
    return res.json({ success: true, data });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: error.message });
  }
};

const oauthCallback = async (req, res) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      return res.redirect(`${frontendUrl}/dashboard?drive=error`);
    }

    if (!code || !state) {
      return res.status(400).json({ success: false, message: 'Missing code/state' });
    }

    await handleOAuthCallback({ code, state });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    return res.redirect(`${frontendUrl}/dashboard?drive=connected`);
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

const status = async (req, res) => {
  try {
    const data = await getDriveStatus(req.user._id);
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const filesList = async (req, res) => {
  try {
    const { parentId, pageSize } = req.query;
    const data = await listFiles({
      userId: req.user._id,
      parentId: parentId || undefined,
      pageSize: pageSize ? Number(pageSize) : 50,
    });

    return res.json({ success: true, data });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: error.message });
  }
};

const folderCreate = async (req, res) => {
  try {
    const { name, parentId } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'name is required' });
    }

    const data = await createFolder({
      userId: req.user._id,
      name,
      parentId: parentId || undefined,
    });

    return res.status(201).json({ success: true, data });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: error.message, data: error.data });
  }
};

const fileUpload = async (req, res) => {
  try {
    const files = (req.files && Array.isArray(req.files) ? req.files : []).concat(req.file ? [req.file] : []);
    if (!files.length) {
      return res.status(400).json({ success: false, message: 'file is required' });
    }

    const parentId = req.body?.parentId;
    const data = await uploadFile({
      userId: req.user._id,
      files,
      parentId: parentId || undefined,
    });

    return res.status(201).json({ success: true, data });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: error.message });
  }
};

const fileDownload = async (req, res) => {
  try {
    const { fileId } = req.params;
    const meta = await getFileMeta({ userId: req.user._id, fileId });

    const resolvedFileId =
      meta?.mimeType === 'application/vnd.google-apps.shortcut' && meta?.shortcutDetails?.targetId
        ? meta.shortcutDetails.targetId
        : fileId;

    const resolvedMimeType =
      meta?.mimeType === 'application/vnd.google-apps.shortcut' && meta?.shortcutDetails?.targetMimeType
        ? meta.shortcutDetails.targetMimeType
        : meta?.mimeType;

    if (resolvedMimeType === 'application/vnd.google-apps.folder') {
      const zip = await downloadFolderZipStream({
        userId: req.user._id,
        folderId: resolvedFileId,
        folderName: meta?.name || fileId,
      });

      res.setHeader('Content-Type', zip.mimeType || 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${zip.filename || 'folder.zip'}"`);

      const stream = zip.stream;
      stream.on('error', (err) => {
        if (!res.headersSent) {
          res.status(500).json({ success: false, message: err.message });
        }
      });

      return stream.pipe(res);
    }

    const result = await downloadFileStream({
      userId: req.user._id,
      fileId: resolvedFileId,
      mimeType: resolvedMimeType,
    });

    const extension = result?.extension || '';
    const safeBaseName = meta.name || fileId;
    const filename = extension && !safeBaseName.endsWith(extension) ? `${safeBaseName}${extension}` : safeBaseName;

    res.setHeader('Content-Type', result?.mimeType || meta.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const stream = result.stream;

    stream.on('error', (err) => {
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: err.message });
      }
    });

    return stream.pipe(res);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAuthUrl,
  oauthCallback,
  status,
  filesList,
  folderCreate,
  fileUpload,
  fileDownload,
  itemRename,
  itemDelete,
  itemShare,
  permissionsList,
  permissionRemove,
};
