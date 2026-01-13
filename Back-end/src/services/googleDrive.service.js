const { google } = require('googleapis');
const jwt = require('jsonwebtoken');
const User = require('../Models/user.model');
const { Readable } = require('stream');

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

  const { data } = await drive.files.list({
    pageSize,
    q: qParts.join(' and '),
    fields: 'nextPageToken, files(id, name, mimeType, modifiedTime, size, parents, webViewLink, webContentLink)',
    orderBy: 'folder,name',
  });

  return data;
};

const createFolder = async ({ userId, name, parentId }) => {
  const { drive } = await getDriveClientForUser(userId);

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

const uploadFile = async ({ userId, file, parentId }) => {
  const { drive } = await getDriveClientForUser(userId);

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

  return data;
};

const getFileMeta = async ({ userId, fileId }) => {
  const { drive } = await getDriveClientForUser(userId);
  const { data } = await drive.files.get({
    fileId,
    fields: 'id, name, mimeType, size',
  });
  return data;
};

const downloadFileStream = async ({ userId, fileId }) => {
  const { drive } = await getDriveClientForUser(userId);

  const res = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'stream' }
  );

  return res.data;
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
  getFileMeta,
  downloadFileStream,
  getDriveStatus,
};
