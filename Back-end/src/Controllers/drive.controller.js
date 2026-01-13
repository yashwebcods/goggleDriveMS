const {
  getDriveAuthUrlForUser,
  handleOAuthCallback,
  listFiles,
  createFolder,
  uploadFile,
  getFileMeta,
  downloadFileStream,
  getDriveStatus,
} = require('../services/googleDrive.service');

const getAuthUrl = async (req, res) => {
  try {
    const url = await getDriveAuthUrlForUser(req.user._id);
    return res.json({ success: true, data: { url } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
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
    return res.status(statusCode).json({ success: false, message: error.message });
  }
};

const fileUpload = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'file is required' });
    }

    const parentId = req.body?.parentId;
    const data = await uploadFile({
      userId: req.user._id,
      file: req.file,
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

    res.setHeader('Content-Type', meta.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${meta.name || fileId}"`);

    const stream = await downloadFileStream({ userId: req.user._id, fileId });

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
};
