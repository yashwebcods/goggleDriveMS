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
const DriveItemMeta = require('../Models/driveItemMeta.model');

const getVisibleUploaderUserIdsForUser = async (user) => {
  const role = String(user?.role || '').toLowerCase();
  const userId = user?._id;

  if (!userId) return [];
  if (role === 'superadmin') return null;

  if (role === 'admin') {
    const managers = await User.find({ createdBy: userId, role: { $regex: /^manager$/i } })
      .select('_id')
      .lean();
    const managerIds = managers.map((u) => u._id).filter(Boolean);

    const directClients = await User.find({ createdBy: userId, role: { $regex: /^client$/i } })
      .select('_id')
      .lean();
    const directClientIds = directClients.map((u) => u._id).filter(Boolean);

    const nestedClients = managerIds.length
      ? await User.find({ createdBy: { $in: managerIds }, role: { $regex: /^client$/i } })
          .select('_id')
          .lean()
      : [];
    const nestedClientIds = nestedClients.map((u) => u._id).filter(Boolean);

    return [userId, ...managerIds, ...directClientIds, ...nestedClientIds];
  }

  if (role === 'manager') {
    const clients = await User.find({ createdBy: userId }).select('_id').lean();
    const clientIds = clients.map((u) => u._id).filter(Boolean);
    return [userId, ...clientIds];
  }

  if (role === 'client') {
    const managerId = user?.createdBy || null;
    return managerId ? [userId, managerId] : [userId];
  }

  return [userId];
};

const getCreatorChainEmails = async (user) => {
  const emails = [];
  const seen = new Set();

  let current = user;
  while (current?.createdBy) {
    const parent = await User.findById(current.createdBy)
      .select('email google.drive.accountEmail createdBy')
      .lean();
    if (!parent) break;
    const resolved =
      (parent?.google?.drive?.accountEmail || parent?.email || '').toString().toLowerCase();
    const email = resolved;
    if (email && !seen.has(email)) {
      seen.add(email);
      emails.push(email);
    }
    current = parent;
  }

  return emails;
};

const getAutoShareEmailsForUploader = async (uploader) => {
  const role = String(uploader?.role || '').toLowerCase();
  const uploaderEmail = (uploader?.google?.drive?.accountEmail || uploader?.email || '').toString().toLowerCase();

  const emails = new Set();
  for (const e of await getCreatorChainEmails(uploader)) emails.add(e);

  if (role === 'client') {
    try {
      const managerId = uploader?.createdBy || null;
      if (managerId) {
        const manager = await User.findById(managerId)
          .select('email google.drive.accountEmail')
          .lean();
        const managerEmail =
          (manager?.google?.drive?.accountEmail || manager?.email || '').toString().toLowerCase();
        if (managerEmail) emails.add(managerEmail);
      }
    } catch (_) {
    }
  }

  if (role === 'manager') {
    const clients = await User.find({ createdBy: uploader?._id, role: { $regex: /^client$/i } })
      .select('email google.drive.accountEmail')
      .lean();
    for (const c of clients) {
      const email = (c?.google?.drive?.accountEmail || c?.email || '').toString().toLowerCase();
      if (email) emails.add(email);
    }
  }

  if (uploaderEmail) emails.delete(uploaderEmail);
  return Array.from(emails);
};

const autoShareDriveItem = async ({ uploaderUser, fileId }) => {
  if (!fileId || !uploaderUser?._id) return;
  const recipients = await getAutoShareEmailsForUploader(uploaderUser);
  if (!recipients.length) return;

  let mimeType = '';
  try {
    const meta = await getFileMeta({ userId: uploaderUser._id, fileId: String(fileId) });
    mimeType = (meta?.mimeType || '').toString();
  } catch (_) {
    mimeType = '';
  }

  const uploaderRole = String(uploaderUser?.role || '').toLowerCase();
  const isFolder = mimeType === 'application/vnd.google-apps.folder';

  // Folder uploads require writer on the parent folder.
  // - If a manager created the folder, clients should get writer.
  // - If a client created the folder, their manager should get writer.
  let managerWriterEmail = null;
  if (uploaderRole === 'client') {
    try {
      const managerId = uploaderUser?.createdBy || null;
      if (managerId) {
        const manager = await User.findById(managerId)
          .select('email google.drive.accountEmail')
          .lean();
        managerWriterEmail =
          (manager?.google?.drive?.accountEmail || manager?.email || '').toString().toLowerCase() || null;
      }
    } catch (_) {
      managerWriterEmail = null;
    }
  }

  const shareRole = uploaderRole === 'client' ? 'reader' : uploaderRole === 'manager' && isFolder ? 'writer' : 'reader';

  for (const email of recipients) {
    try {
      const normalizedEmail = String(email || '').toLowerCase();
      const perRecipientRole =
        managerWriterEmail && normalizedEmail === managerWriterEmail ? 'writer' : shareRole;
      await shareFile({
        userId: uploaderUser._id,
        fileId: String(fileId),
        email,
        role: perRecipientRole,
        sendNotificationEmail: false,
      });
    } catch (_) {
    }
  }

  try {
    const normalized = recipients.map((e) => String(e || '').toLowerCase()).filter(Boolean);
    const users = normalized.length
      ? await User.find({
          $or: [
            { email: { $in: normalized } },
            { 'google.drive.accountEmail': { $in: normalized } },
          ],
        })
          .select('_id')
          .lean()
      : [];
    const ids = (users || []).map((u) => u?._id).filter(Boolean);

    await DriveItemMeta.updateOne(
      { fileId: String(fileId) },
      {
        $set: { autoSharedAt: new Date() },
        ...(ids.length ? { $addToSet: { sharedWithUserIds: { $each: ids } } } : {}),
      },
      { upsert: true }
    );
  } catch (_) {
  }
};

const assertDriveItemAccess = async ({ reqUser, fileId }) => {
  const allowed = await getVisibleUploaderUserIdsForUser(reqUser);
  if (allowed === null) return;

  const meta = await DriveItemMeta.findOne({ fileId: String(fileId) })
    .select('uploadedByUserId sharedWithUserIds')
    .lean();
  const uploaderId = meta?.uploadedByUserId ? String(meta.uploadedByUserId) : null;
  const isAllowed = uploaderId && allowed.map(String).includes(String(uploaderId));

  const sharedWith = Array.isArray(meta?.sharedWithUserIds) ? meta.sharedWithUserIds.map(String) : [];
  const isExplicitlyShared = sharedWith.includes(String(reqUser?._id || ''));

  if (!isAllowed && !isExplicitlyShared) {
    const err = new Error('Not authorized to access this item');
    err.statusCode = 403;
    throw err;
  }
};

const upsertDriveMeta = async ({ fileId, uploadedByEmail, uploadedByUserId }) => {
  if (!fileId) return;
  await DriveItemMeta.updateOne(
    { fileId: String(fileId) },
    {
      $set: {
        uploadedByEmail: uploadedByEmail ? String(uploadedByEmail).toLowerCase() : null,
        uploadedByUserId: uploadedByUserId || null,
      },
    },
    { upsert: true }
  );
};

const disconnect = async (req, res) => {
  try {
    await User.updateOne(
      { _id: req.user._id },
      {
        $set: {
          'google.drive.connected': false,
          'google.drive.accessToken': null,
          'google.drive.refreshToken': null,
          'google.drive.expiryDate': null,
          'google.drive.scope': null,
          'google.drive.tokenType': null,
          'google.drive.accountEmail': null,
        },
      }
    );

    return res.json({ success: true, data: { disconnected: true } });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: error.message });
  }
};

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

    await assertDriveItemAccess({ reqUser: req.user, fileId });

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

    await assertDriveItemAccess({ reqUser: req.user, fileId });
    const data = await deleteFile({ userId: req.user._id, fileId });

    try {
      await DriveItemMeta.deleteOne({ fileId: String(fileId) });
    } catch (_) {
    }

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

    await assertDriveItemAccess({ reqUser: req.user, fileId });

    let resolvedEmail = email || undefined;
    let resolvedTargetUserId = targetUserId || undefined;

    if (!resolvedEmail && targetUserId) {
      const targetUser = await User.findById(targetUserId).select('email isActive');
      if (!targetUser || !targetUser.email) {
        return res.status(404).json({ success: false, message: 'Target user not found' });
      }
      if (!targetUser.isActive) {
        return res.status(400).json({ success: false, message: 'Target user is not active' });
      }
      resolvedEmail = targetUser.email;
      resolvedTargetUserId = String(targetUserId);
    }

    if (!resolvedTargetUserId && resolvedEmail) {
      const targetUser = await User.findOne({
        $or: [{ email: String(resolvedEmail).toLowerCase() }, { 'google.drive.accountEmail': String(resolvedEmail).toLowerCase() }],
      })
        .select('_id')
        .lean();
      if (targetUser?._id) resolvedTargetUserId = String(targetUser._id);
    }

    if (resolvedEmail && String(resolvedEmail).toLowerCase() === String(req.user.email || '').toLowerCase()) {
      return res.status(400).json({ success: false, message: 'You cannot share to yourself' });
    }

    const data = await shareFile({ userId: req.user._id, fileId, email: resolvedEmail, role: role || undefined });

    if (resolvedTargetUserId) {
      try {
        await DriveItemMeta.updateOne(
          { fileId: String(fileId) },
          { $addToSet: { sharedWithUserIds: resolvedTargetUserId } },
          { upsert: true }
        );
      } catch (_) {
      }
    }
    return res.json({ success: true, data });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: error.message });
  }
};

const permissionsList = async (req, res) => {
  try {
    const { fileId } = req.params;

    await assertDriveItemAccess({ reqUser: req.user, fileId });
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

    await assertDriveItemAccess({ reqUser: req.user, fileId });
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
      return res.redirect(`${frontendUrl}/#/dashboard?drive=error`);
    }

    if (!code || !state) {
      return res.status(400).json({ success: false, message: 'Missing code/state' });
    }

    await handleOAuthCallback({ code, state });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    return res.redirect(`${frontendUrl}/#/dashboard?drive=connected`);
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
    const { parentId, pageSize, pageToken, scope, gdmsOnly } = req.query;
    const gdmsOnlyFlag = String(gdmsOnly || '').toLowerCase() === 'true';
    const data = await listFiles({
      userId: req.user._id,
      parentId: parentId || undefined,
      pageSize: pageSize ? Number(pageSize) : 50,
      pageToken: pageToken ? String(pageToken) : undefined,
      scope: scope || undefined,
      gdmsOnly: gdmsOnlyFlag,
    });

    const files = Array.isArray(data?.files) ? data.files : [];
    const ids = files.map((f) => String(f?.id || '')).filter(Boolean);

    if (ids.length) {
      const metas = await DriveItemMeta.find({ fileId: { $in: ids } })
        .select('fileId uploadedByEmail uploadedByUserId autoSharedAt sharedWithUserIds')
        .lean();
      const metaById = new Map(metas.map((m) => [String(m.fileId), m]));

      if (gdmsOnlyFlag) {
        const visible = await getVisibleUploaderUserIdsForUser(req.user);
        const visibleSet = visible === null ? null : new Set((visible || []).map((x) => String(x)));

        const gdmsFiles = files.filter((f) => metaById.has(String(f?.id || '')));
        const filtered = visibleSet
          ? gdmsFiles.filter((f) => {
            const m = metaById.get(String(f?.id || ''));
            const uploaderId = m?.uploadedByUserId ? String(m.uploadedByUserId) : null;
            if (uploaderId && visibleSet.has(uploaderId)) return true;
            const sharedWith = Array.isArray(m?.sharedWithUserIds) ? m.sharedWithUserIds.map(String) : [];
            return sharedWith.includes(String(req.user?._id || ''));
          })
          : gdmsFiles;

        data.files = filtered.map((f) => {
          const m = metaById.get(String(f?.id || ''));
          return {
            ...f,
            uploadedByEmail: m?.uploadedByEmail || null,
          };
        });

        return res.json({ success: true, data });
      }

      const missingIds = ids.filter((id) => !metaById.has(String(id)));
      if (missingIds.length) {
        const emailByFileId = new Map();
        for (const f of files) {
          const fileId = String(f?.id || '');
          if (!fileId || !missingIds.includes(fileId)) continue;

          const rawEmail =
            f?.ownerEmail ||
            f?.lastModifyingUser?.emailAddress ||
            (Array.isArray(f?.owners) ? f.owners[0]?.emailAddress : null) ||
            null;

          const normalized = rawEmail ? String(rawEmail).toLowerCase() : null;
          if (normalized) emailByFileId.set(fileId, normalized);
        }

        const emails = Array.from(new Set(Array.from(emailByFileId.values())));
        if (emails.length) {
          const users = await User.find({
            $or: [
              { email: { $in: emails } },
              { 'google.drive.accountEmail': { $in: emails } },
            ],
          })
            .select('_id email google.drive.accountEmail')
            .lean();

          const userIdByEmail = new Map();
          for (const u of users || []) {
            const e1 = (u?.email || '').toString().toLowerCase();
            const e2 = (u?.google?.drive?.accountEmail || '').toString().toLowerCase();
            if (e1 && u?._id) userIdByEmail.set(e1, u._id);
            if (e2 && u?._id) userIdByEmail.set(e2, u._id);
          }

          const ops = [];
          for (const [fileId, email] of emailByFileId.entries()) {
            const uploaderUserId = userIdByEmail.get(String(email));
            if (!uploaderUserId) continue;
            ops.push({
              updateOne: {
                filter: { fileId: String(fileId) },
                update: {
                  $set: {
                    uploadedByEmail: String(email),
                    uploadedByUserId: uploaderUserId,
                  },
                },
                upsert: true,
              },
            });
          }

          if (ops.length) {
            try {
              await DriveItemMeta.bulkWrite(ops, { ordered: false });
            } catch (_) {
            }

            const refreshed = await DriveItemMeta.find({ fileId: { $in: missingIds } })
              .select('fileId uploadedByEmail uploadedByUserId autoSharedAt')
              .lean();
            for (const m of refreshed || []) {
              metaById.set(String(m.fileId), m);
            }
          }
        }
      }

      const reqRole = String(req.user?.role || '').toLowerCase();
      const canAutoShareLegacy = reqRole === 'manager' || reqRole === 'client';
      if (canAutoShareLegacy) {
        const toShareIds = [];
        for (const f of files) {
          const fileId = String(f?.id || '');
          if (!fileId) continue;
          const m = metaById.get(fileId);
          const uploaderId = m?.uploadedByUserId ? String(m.uploadedByUserId) : null;
          const alreadyShared = Boolean(m?.autoSharedAt);
          if (alreadyShared) continue;
          if (uploaderId && String(uploaderId) === String(req.user._id)) {
            toShareIds.push(fileId);
          }
        }

        if (toShareIds.length) {
          for (const fileId of toShareIds) {
            await autoShareDriveItem({ uploaderUser: req.user, fileId });
          }

          try {
            await DriveItemMeta.updateMany(
              { fileId: { $in: toShareIds } },
              { $set: { autoSharedAt: new Date() } }
            );
          } catch (_) {
          }
        }
      }

      const allowed = await getVisibleUploaderUserIdsForUser(req.user);
      const allowedSet = allowed === null ? null : new Set((allowed || []).map((x) => String(x)));

      let allowedEmailSet = null;
      let allowedUserIdByEmail = null;
      if (allowedSet) {
        const allowedUsers = await User.find({ _id: { $in: allowed || [] } })
          .select('_id email google.drive.accountEmail')
          .lean();
        allowedEmailSet = new Set();
        allowedUserIdByEmail = new Map();
        for (const u of allowedUsers || []) {
          const id = u?._id ? String(u._id) : '';
          const e1 = (u?.email || '').toString().toLowerCase();
          const e2 = (u?.google?.drive?.accountEmail || '').toString().toLowerCase();
          if (e1) {
            allowedEmailSet.add(e1);
            if (id) allowedUserIdByEmail.set(e1, id);
          }
          if (e2) {
            allowedEmailSet.add(e2);
            if (id) allowedUserIdByEmail.set(e2, id);
          }
        }
      }

      const inferredOps = [];

      const filteredFiles = allowedSet
        ? files.filter((f) => {
          const m = metaById.get(String(f?.id || ''));
          const uploaderId = m?.uploadedByUserId ? String(m.uploadedByUserId) : null;
          if (uploaderId) return allowedSet.has(uploaderId);

          const sharedWith = Array.isArray(m?.sharedWithUserIds) ? m.sharedWithUserIds.map(String) : [];
          if (sharedWith.includes(String(req.user?._id || ''))) return true;

          const rawEmail = f?.ownerEmail || null;
          const normalizedEmail = rawEmail ? String(rawEmail).toLowerCase() : null;
          const allowedByEmail = normalizedEmail && allowedEmailSet && allowedEmailSet.has(normalizedEmail);
          if (!allowedByEmail) return false;

          // Backfill meta when we can infer the uploader from email.
          const inferredUserId = normalizedEmail && allowedUserIdByEmail ? allowedUserIdByEmail.get(normalizedEmail) : null;
          const fileId = String(f?.id || '');
          if (fileId && inferredUserId) {
            const existing = metaById.get(fileId);
            const existingUploader = existing?.uploadedByUserId ? String(existing.uploadedByUserId) : null;
            if (!existingUploader) {
              inferredOps.push({
                updateOne: {
                  filter: { fileId: String(fileId) },
                  update: {
                    $set: {
                      uploadedByEmail: normalizedEmail,
                      uploadedByUserId: inferredUserId,
                    },
                  },
                  upsert: true,
                },
              });
              metaById.set(fileId, {
                ...(existing || {}),
                fileId: String(fileId),
                uploadedByEmail: normalizedEmail,
                uploadedByUserId: inferredUserId,
              });
            }
          }

          return true;
        })
        : files;

      if (inferredOps.length) {
        try {
          await DriveItemMeta.bulkWrite(inferredOps, { ordered: false });
        } catch (_) {
        }
      }

      data.files = filteredFiles.map((f) => {
        const m = metaById.get(String(f?.id || ''));
        return {
          ...f,
          uploadedByEmail: m?.uploadedByEmail || null,
        };
      });
    }

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

    await upsertDriveMeta({
      fileId: data?.id,
      uploadedByEmail: req.user?.google?.drive?.accountEmail || req.user?.email,
      uploadedByUserId: req.user?._id,
    });

    await autoShareDriveItem({ uploaderUser: req.user, fileId: data?.id });

    return res.status(201).json({ success: true, data });
  } catch (error) {
    const statusCode = error.statusCode || error?.code || error?.response?.status || 500;
    const apiMessage = error?.response?.data?.error?.message || error?.response?.data?.message;
    return res.status(statusCode).json({ success: false, message: apiMessage || error.message, data: error.data });
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

    const items = Array.isArray(data) ? data : [];
    for (const it of items) {
      await upsertDriveMeta({
        fileId: it?.id,
        uploadedByEmail: req.user?.google?.drive?.accountEmail || req.user?.email,
        uploadedByUserId: req.user?._id,
      });

      await autoShareDriveItem({ uploaderUser: req.user, fileId: it?.id });
    }

    return res.status(201).json({ success: true, data });
  } catch (error) {
    const statusCode = error.statusCode || error?.code || error?.response?.status || 500;
    const apiMessage = error?.response?.data?.error?.message || error?.response?.data?.message;
    return res.status(statusCode).json({ success: false, message: apiMessage || error.message });
  }
};

const fileDownload = async (req, res) => {
  try {
    const { fileId } = req.params;

    await assertDriveItemAccess({ reqUser: req.user, fileId });
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
    const statusCode = error.statusCode || error?.code || error?.response?.status || 500;
    const apiMessage = error?.response?.data?.error?.message || error?.response?.data?.message;
    return res.status(statusCode).json({ success: false, message: apiMessage || error.message });
  }
};

module.exports = {
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
};
