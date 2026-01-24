const { google } = require('googleapis');
const jwt = require('jsonwebtoken');
const User = require('../Models/user.model');
const { Readable, PassThrough } = require('stream');
const archiver = require('archiver');

const GDMS_APP_PROPERTY_KEY = 'gdms';
const GDMS_APP_PROPERTY_VALUE = 'true';
const GDMS_APP_PROPERTY_QUERY = `appProperties has { key='${GDMS_APP_PROPERTY_KEY}' and value='${GDMS_APP_PROPERTY_VALUE}' }`;

const REQUIRED_DRIVE_FILE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const REQUIRED_DRIVE_METADATA_SCOPE = 'https://www.googleapis.com/auth/drive.metadata.readonly';

const hasRequiredDriveScopes = (scopeString) => {
  const s = (scopeString || '').toString();
  if (!s) return false;
  const parts = s.split(/\s+/g);
  const hasDriveFile = parts.includes(REQUIRED_DRIVE_FILE_SCOPE) || s.includes('drive.file');
  const hasMetadata = parts.includes(REQUIRED_DRIVE_METADATA_SCOPE) || s.includes('drive.metadata.readonly');
  return hasDriveFile && hasMetadata;
};

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
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/drive.metadata.readonly',
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

  try {
    oauth2Client.setCredentials({
      access_token: tokens.access_token || undefined,
      refresh_token: tokens.refresh_token || undefined,
      expiry_date: tokens.expiry_date || undefined,
    });

    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    const about = await drive.about.get({ fields: 'user(emailAddress)' });
    const email = about?.data?.user?.emailAddress ? String(about.data.user.emailAddress).toLowerCase() : '';
    if (email) {
      await User.updateOne({ _id: userId }, { $set: { 'google.drive.accountEmail': email } });
    }
  } catch (_) {
  }

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

  if (!hasRequiredDriveScopes(driveState?.scope)) {
    const err = new Error('Google Drive permissions are outdated. Please reconnect Google Drive.');
    err.statusCode = 401;
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

  if (!driveState?.accountEmail) {
    try {
      const about = await drive.about.get({ fields: 'user(emailAddress)' });
      const email = about?.data?.user?.emailAddress ? String(about.data.user.emailAddress).toLowerCase() : '';
      if (email) {
        await User.updateOne({ _id: userId }, { $set: { 'google.drive.accountEmail': email } });
      }
    } catch (_) {
    }
  }

  return { drive, oauth2Client };
};

const listFiles = async ({ userId, parentId, pageSize = 50, pageToken, scope, gdmsOnly }) => {
  const { drive } = await getDriveClientForUser(userId);

  const qParts = [];
  const gdmsOnlyFlag = Boolean(gdmsOnly);
  if (gdmsOnlyFlag) {
    qParts.push(GDMS_APP_PROPERTY_QUERY);
    if (scope !== 'sharedWithMe') {
      qParts.push("'me' in owners");
    }
  }
  if (parentId) {
    qParts.push(`'${parentId}' in parents`);
  } else if (scope === 'sharedWithMe') {
    qParts.push('sharedWithMe');
  } else if (scope === 'allFiles') {
    qParts.push("mimeType != 'application/vnd.google-apps.folder'");
  } else {
    qParts.push("'root' in parents");
  }
  qParts.push('trashed = false');

  const perPage = Math.max(1, Math.min(1000, Number(pageSize) || 50));
  const { data } = await drive.files.list({
    pageSize: perPage,
    pageToken: pageToken || undefined,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
    spaces: 'drive',
    q: qParts.join(' and '),
    fields:
      'nextPageToken, files(id, name, mimeType, modifiedTime, size, parents, webViewLink, webContentLink, '
      + 'owners(emailAddress,displayName), lastModifyingUser(emailAddress,displayName), '
      + 'shortcutDetails(targetId,targetMimeType), appProperties)',
    orderBy:
      scope === 'sharedWithMe'
        ? 'sharedWithMeTime desc'
        : scope === 'allFiles'
          ? 'modifiedTime desc'
          : 'folder,name',
  });

  const files = (data.files || []).map((f) => {
    const owner = Array.isArray(f?.owners) ? f.owners[0] : undefined;
    const lastMod = f?.lastModifyingUser;
    return {
      ...f,
      ownerEmail: owner?.emailAddress || lastMod?.emailAddress || null,
      ownerName: owner?.displayName || lastMod?.displayName || null,
    };
  });

  return { files, nextPageToken: data.nextPageToken || null };
};

const escapeDriveQueryValue = (value) => {
  return String(value || '').replace(/'/g, "\\'");
};

const createFolder = async ({ userId, name, parentId }) => {
  const { drive } = await getDriveClientForUser(userId);

  const parentKey = parentId || 'root';
  const q = `${GDMS_APP_PROPERTY_QUERY} and name = '${escapeDriveQueryValue(name)}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false and '${escapeDriveQueryValue(
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
    appProperties: {
      [GDMS_APP_PROPERTY_KEY]: GDMS_APP_PROPERTY_VALUE,
    },
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

const shareFile = async ({ userId, fileId, email, role, sendNotificationEmail }) => {
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

  try {
    await drive.permissions.create({
      fileId,
      supportsAllDrives: true,
      requestBody,
      sendNotificationEmail:
        typeof sendNotificationEmail === 'boolean' ? sendNotificationEmail : Boolean(email),
    });
  } catch (err) {
    const status = err?.code || err?.response?.status;
    const isAlreadyHasPermission = status === 409;

    if (isAlreadyHasPermission && email) {
      try {
        const existing = await drive.permissions.list({
          fileId,
          supportsAllDrives: true,
          fields: 'permissions(id, type, role, emailAddress)',
        });
        const perms = existing?.data?.permissions || [];
        const normalized = String(email).toLowerCase();
        const match = perms.find(
          (p) => (p?.emailAddress || '').toString().toLowerCase() === normalized
        );

        const currentRole = (match?.role || '').toString();
        const shouldUpgrade = currentRole && currentRole !== resolvedRole;
        if (match?.id && shouldUpgrade) {
          await drive.permissions.update({
            fileId,
            permissionId: match.id,
            supportsAllDrives: true,
            requestBody: { role: resolvedRole },
          });
        }
      } catch (_) {
      }

      // Even if upgrade fails, do not fail the caller.
    } else {
      throw err;
    }
  }

  const { data } = await drive.files.get({
    fileId,
    supportsAllDrives: true,
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

  const inputFiles = Array.isArray(files) ? files : [];
  const items = new Array(inputFiles.length);

  const maxConcurrent = Math.max(1, Number(process.env.DRIVE_UPLOAD_CONCURRENCY) || 3);
  let nextIndex = 0;

  const uploadOne = async (file) => {
    const requestBody = {
      name: file.originalname,
      appProperties: {
        [GDMS_APP_PROPERTY_KEY]: GDMS_APP_PROPERTY_VALUE,
      },
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
    return data;
  };

  const workerCount = Math.min(maxConcurrent, inputFiles.length || 0);
  const workers = new Array(workerCount).fill(0).map(async () => {
    while (true) {
      const idx = nextIndex;
      nextIndex += 1;
      if (idx >= inputFiles.length) break;
      items[idx] = await uploadOne(inputFiles[idx]);
    }
  });

  await Promise.all(workers);
  return items.filter(Boolean);
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
