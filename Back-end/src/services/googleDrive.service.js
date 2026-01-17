const { google } = require('googleapis');
const jwt = require('jsonwebtoken');
const User = require('../Models/user.model');
const { Readable, PassThrough } = require('stream');
const archiver = require('archiver');

const getOAuth2Client = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Google OAuth is not configured (missing GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET/GOOGLE_REDIRECT_URI)');
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
};

const createState = (payload) => {
  const secret = process.env.GOOGLE_OAUTH_STATE_SECRET;
  if (!secret) {
    throw new Error('GOOGLE_OAUTH_STATE_SECRET is not set');
  }

  return jwt.sign(payload, secret, { expiresIn: '10m' });
};

const verifyState = (state) => {
  const secret = process.env.GOOGLE_OAUTH_STATE_SECRET;
  if (!secret) {
    throw new Error('GOOGLE_OAUTH_STATE_SECRET is not set');
  }

  return jwt.verify(state, secret);
};

const getDriveAuthUrlForUser = async (userId) => {
  const oauth2Client = getOAuth2Client();

  const state = createState({ userId: String(userId) });

  const scopes = [
    'https://www.googleapis.com/auth/drive',
  ];

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: scopes,
    state,
  });

  return url;
};

const saveTokensToUser = async (userId, tokens) => {
  const update = {
    'google.drive.connected': true,
    'google.drive.accessToken': tokens.access_token || null,
    'google.drive.expiryDate': tokens.expiry_date || null,
    'google.drive.scope': tokens.scope || null,
    'google.drive.tokenType': tokens.token_type || null,
  };

  if (tokens.refresh_token) {
    update['google.drive.refreshToken'] = tokens.refresh_token;
  }

  await User.updateOne({ _id: userId }, { $set: update });
};

const handleOAuthCallback = async ({ code, state }) => {
  const decoded = verifyState(state);
  const userId = decoded.userId;

  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  await saveTokensToUser(userId, tokens);

  return { userId, tokens };
};

const getDriveClientForUser = async (userId) => {
  const user = await User.findById(userId).select('google');
  const driveState = user?.google?.drive;

  if (!driveState?.connected || !driveState?.refreshToken) {
    const err = new Error('Google Drive is not connected');
    err.statusCode = 400;
    throw err;
  }

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    access_token: driveState.accessToken || undefined,
    refresh_token: driveState.refreshToken || undefined,
    expiry_date: driveState.expiryDate || undefined,
  });

  oauth2Client.on('tokens', async (tokens) => {
    try {
      await saveTokensToUser(userId, tokens);
    } catch (_) {
    }
  });

  const drive = google.drive({ version: 'v3', auth: oauth2Client });
  return { drive, oauth2Client };
};

const listFiles = async ({ userId, parentId, pageSize = 50 }) => {
  const { drive } = await getDriveClientForUser(userId);

  const qParts = [];
  if (parentId) qParts.push(`'${parentId}' in parents`);
  qParts.push('trashed = false');

  const totalLimit = Math.max(1, Number(pageSize) || 50);
  const files = [];
  let pageToken = undefined;

  do {
    const remaining = totalLimit - files.length;
    if (remaining <= 0) break;

    const perPage = Math.min(1000, remaining);
    const { data } = await drive.files.list({
      pageSize: perPage,
      pageToken,
      q: qParts.join(' and '),
      fields: 'nextPageToken, files(id, name, mimeType, modifiedTime, size, parents, webViewLink, webContentLink, shortcutDetails(targetId,targetMimeType))',
      orderBy: 'folder,name',
    });

    files.push(...(data.files || []));
    pageToken = data.nextPageToken || undefined;
  } while (pageToken);

  return { files };
};

const escapeDriveQueryValue = (value) => {
  return String(value || '').replace(/'/g, "\\'");
};

const createFolder = async ({ userId, name, parentId }) => {
  const { drive } = await getDriveClientForUser(userId);

  const parentKey = parentId || 'root';
  const q = `name = '${escapeDriveQueryValue(name)}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false and '${escapeDriveQueryValue(
    parentKey
  )}' in parents`;

  const existing = await drive.files.list({
    q,
    pageSize: 1,
    fields: 'files(id, name, mimeType, parents)',
  });

  const existingFolder = (existing?.data?.files || [])[0];
  if (existingFolder) {
    const err = new Error('Folder already exists');
    err.statusCode = 409;
    err.data = { existing: existingFolder };
    throw err;
  }

  const requestBody = {
    name,
    mimeType: 'application/vnd.google-apps.folder',
  };

  if (parentId) requestBody.parents = [parentId];

  const { data } = await drive.files.create({
    requestBody,
    fields: 'id, name, mimeType, parents',
  });

  return data;
};

const renameFile = async ({ userId, fileId, name }) => {
  const { drive } = await getDriveClientForUser(userId);
  const { data } = await drive.files.update({
    fileId,
    requestBody: { name },
    fields: 'id, name, mimeType, parents',
  });
  return data;
};

const deleteFile = async ({ userId, fileId }) => {
  const { drive } = await getDriveClientForUser(userId);
  await drive.files.delete({ fileId });
  return { deleted: true };
};

const shareFile = async ({ userId, fileId, email, role }) => {
  const { drive } = await getDriveClientForUser(userId);

  const resolvedRole = role || 'reader';
  if (!['reader', 'commenter', 'writer'].includes(resolvedRole)) {
    const err = new Error('Invalid role');
    err.statusCode = 400;
    throw err;
  }

  const requestBody = email
    ? { type: 'user', role: resolvedRole, emailAddress: email }
    : { type: 'anyone', role: resolvedRole };

  await drive.permissions.create({
    fileId,
    requestBody,
    sendNotificationEmail: Boolean(email),
  });

  const { data } = await drive.files.get({
    fileId,
    fields: 'id, name, webViewLink',
  });

  return { link: data.webViewLink, id: data.id, name: data.name };
};

const listPermissions = async ({ userId, fileId }) => {
  const { drive } = await getDriveClientForUser(userId);
  const { data } = await drive.permissions.list({
    fileId,
    fields: 'permissions(id, type, role, emailAddress, displayName, domain, allowFileDiscovery)',
  });
  return { permissions: data.permissions || [] };
};

const removePermission = async ({ userId, fileId, permissionId }) => {
  const { drive } = await getDriveClientForUser(userId);
  await drive.permissions.delete({ fileId, permissionId });
  return { removed: true };
};

const uploadFile = async ({ userId, files, parentId }) => {
  const { drive } = await getDriveClientForUser(userId);

  const items = [];

  for (const file of files || []) {
    const requestBody = {
      name: file.originalname,
    };

    if (parentId) requestBody.parents = [parentId];

    const media = {
      mimeType: file.mimetype,
      body: Readable.from(file.buffer),
    };

    const { data } = await drive.files.create({
      requestBody,
      media,
      fields: 'id, name, mimeType, parents, size',
    });

    items.push(data);
  }

  return items;
};

const getFileMeta = async ({ userId, fileId }) => {
  const { drive } = await getDriveClientForUser(userId);
  const { data } = await drive.files.get({
    fileId,
    fields: 'id, name, mimeType, size, shortcutDetails(targetId,targetMimeType)',
  });
  return data;
};

const resolveExportFormat = (driveMimeType) => {
  const map = {
    'application/vnd.google-apps.document': {
      mimeType: 'application/pdf',
      extension: '.pdf',
    },
    'application/vnd.google-apps.spreadsheet': {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      extension: '.xlsx',
    },
    'application/vnd.google-apps.presentation': {
      mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      extension: '.pptx',
    },
    'application/vnd.google-apps.drawing': {
      mimeType: 'image/png',
      extension: '.png',
    },
  };

  return map[driveMimeType] || null;
};

const sanitizeZipEntryName = (name) => {
  if (!name) return 'file';
  return String(name).replace(/[\\/]+/g, '_');
};

const listChildren = async ({ drive, folderId }) => {
  const files = [];
  let pageToken = undefined;
  do {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'nextPageToken, files(id, name, mimeType, shortcutDetails(targetId,targetMimeType))',
      pageSize: 1000,
      pageToken,
      orderBy: 'folder,name',
    });

    files.push(...(res.data.files || []));
    pageToken = res.data.nextPageToken || undefined;
  } while (pageToken);

  return files;
};

const resolveShortcut = (file) => {
  if (file?.mimeType === 'application/vnd.google-apps.shortcut') {
    return {
      id: file?.shortcutDetails?.targetId || file.id,
      mimeType: file?.shortcutDetails?.targetMimeType || file.mimeType,
      name: file.name,
    };
  }
  return { id: file.id, mimeType: file.mimeType, name: file.name };
};

const getDriveFileStreamForZip = async ({ drive, fileId, mimeType }) => {
  if (mimeType && String(mimeType).startsWith('application/vnd.google-apps')) {
    const exportFormat = resolveExportFormat(mimeType);
    if (!exportFormat) {
      return null;
    }

    const res = await drive.files.export(
      { fileId, mimeType: exportFormat.mimeType },
      { responseType: 'stream' }
    );
    return {
      stream: res.data,
      mimeType: exportFormat.mimeType,
      extension: exportFormat.extension,
    };
  }

  const res = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'stream' }
  );
  return { stream: res.data, mimeType: mimeType || 'application/octet-stream', extension: '' };
};

const downloadFolderZipStream = async ({ userId, folderId, folderName }) => {
  const { drive } = await getDriveClientForUser(userId);

  const output = new PassThrough();
  const archive = archiver('zip', { zlib: { level: 9 } });

  archive.on('error', (err) => {
    output.destroy(err);
  });

  archive.pipe(output);

  const addFolder = async (currentFolderId, prefix) => {
    const children = await listChildren({ drive, folderId: currentFolderId });

    for (const child of children) {
      const resolved = resolveShortcut(child);
      const entryName = sanitizeZipEntryName(resolved.name || resolved.id);

      if (resolved.mimeType === 'application/vnd.google-apps.folder') {
        await addFolder(resolved.id, `${prefix}${entryName}/`);
        continue;
      }

      const fileData = await getDriveFileStreamForZip({
        drive,
        fileId: resolved.id,
        mimeType: resolved.mimeType,
      });

      if (!fileData) {
        archive.append(
          Buffer.from(`Unsupported Google Docs type: ${resolved.mimeType}\n`),
          { name: `${prefix}${entryName}.txt` }
        );
        continue;
      }

      const filename = fileData.extension && !entryName.endsWith(fileData.extension)
        ? `${entryName}${fileData.extension}`
        : entryName;

      archive.append(fileData.stream, { name: `${prefix}${filename}` });
    }
  };

  (async () => {
    try {
      await addFolder(folderId, '');
      await archive.finalize();
    } catch (e) {
      output.destroy(e);
    }
  })();

  return {
    stream: output,
    mimeType: 'application/zip',
    extension: '.zip',
    filename: `${sanitizeZipEntryName(folderName || 'folder')}.zip`,
  };
};

const downloadFileStream = async ({ userId, fileId, mimeType }) => {
  const { drive } = await getDriveClientForUser(userId);

  if (mimeType && String(mimeType).startsWith('application/vnd.google-apps')) {
    const exportFormat = resolveExportFormat(mimeType);
    if (!exportFormat) {
      const err = new Error('This Google Docs file type cannot be downloaded directly');
      err.statusCode = 400;
      throw err;
    }

    const res = await drive.files.export(
      { fileId, mimeType: exportFormat.mimeType },
      { responseType: 'stream' }
    );

    return {
      stream: res.data,
      mimeType: exportFormat.mimeType,
      extension: exportFormat.extension,
      isExport: true,
    };
  }

  const res = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'stream' }
  );

  return {
    stream: res.data,
    mimeType: mimeType || 'application/octet-stream',
    extension: '',
    isExport: false,
  };
};

const getDriveStatus = async (userId) => {
  const user = await User.findById(userId).select('google');
  const driveState = user?.google?.drive;
  return {
    connected: Boolean(driveState?.connected && driveState?.refreshToken),
  };
};

module.exports = {
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
};
