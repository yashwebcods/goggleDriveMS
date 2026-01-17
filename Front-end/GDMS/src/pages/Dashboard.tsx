import MainSection from '../components/dashboard/MainSection';
import FolderContainer from '../components/dashboard/FolderContainer';
import Sidebar from '../components/dashboard/Sidebar';
import TopHeader from '../components/dashboard/TopHeader';
import type { FileRow } from '../components/dashboard/types';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { driveService } from '../services/drive.services';
import { userService } from '../services/user.services';
import PopupCard from '../components/PopupCard';
import { getDroppedFiles, type DroppedFile } from '../utils/dragDropFolders';
const Dashboard = () => {
  const [profile, setProfile] = useState<any>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [driveConnected, setDriveConnected] = useState(false);
  const [files, setFiles] = useState<FileRow[]>([]);
  const [folderName, setFolderName] = useState('');
  const [uploadFile, setUploadFile] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'rename' | 'share' | 'delete'>('rename');
  const [dialogFolderId, setDialogFolderId] = useState<string>('');
  const [dialogFolderName, setDialogFolderName] = useState<string>('');
  const [dialogError, setDialogError] = useState<string>('');
  const [renameValue, setRenameValue] = useState<string>('');
  const [shareEmail, setShareEmail] = useState<string>('');
  const [shareLink, setShareLink] = useState<string>('');

  const [folderExistsOpen, setFolderExistsOpen] = useState(false);
  const [existingFolderId, setExistingFolderId] = useState<string>('');
  const [existingFolderName, setExistingFolderName] = useState<string>('');
  const [renameAndCreateValue, setRenameAndCreateValue] = useState<string>('');

  const [isUploadDragOver, setIsUploadDragOver] = useState(false);

  const [dropChoiceOpen, setDropChoiceOpen] = useState(false);
  const [dropFolderFiles, setDropFolderFiles] = useState<DroppedFile[]>([]);
  const [dropLooseFiles, setDropLooseFiles] = useState<DroppedFile[]>([]);

  const [dropFolderExistsOpen, setDropFolderExistsOpen] = useState(false);
  const [dropExistingFolderId, setDropExistingFolderId] = useState<string>('');
  const [dropExistingFolderName, setDropExistingFolderName] = useState<string>('');
  const [dropRenameAndUploadValue, setDropRenameAndUploadValue] = useState<string>('');
  const [pendingDropFolderItems, setPendingDropFolderItems] = useState<DroppedFile[]>([]);
  const [pendingDropBaseParentId, setPendingDropBaseParentId] = useState<string | undefined>(undefined);
  const [pendingDropLooseItems, setPendingDropLooseItems] = useState<DroppedFile[]>([]);

  const [fileExistsOpen, setFileExistsOpen] = useState(false);
  const [existingFileId, setExistingFileId] = useState<string>('');
  const [existingFileName, setExistingFileName] = useState<string>('');
  const [renameAndUploadFileValue, setRenameAndUploadFileValue] = useState<string>('');
  const [pendingUploadFiles, setPendingUploadFiles] = useState<File[]>([]);
  const [pendingUploadParentId, setPendingUploadParentId] = useState<string | undefined>(undefined);

  const token = localStorage.getItem('token') || '';

  const ensureAuth = () => {
    if (!token) {
      navigate('/login', { replace: true });
      return false;
    }
    return true;
  };

  const loadDriveStatus = async () => {
    if (!ensureAuth()) return;
    const result = await driveService.status(token);
    if (!result?.success) {
      if (result?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login', { replace: true });
        return;
      }
      setError(result?.message || 'Failed to load Drive status');
      return;
    }
    const connected = Boolean(result?.data?.connected);
    setDriveConnected(connected);
    return connected;
  };

  const mapMimeToType = (mimeType?: string): FileRow['type'] => {
    if (!mimeType) return 'doc';
    if (mimeType === 'application/vnd.google-apps.spreadsheet') return 'sheet';
    return 'doc';
  };

  const toDisplayDate = (value?: string) => {
    if (!value) return '';
    try {
      return new Date(value).toLocaleString();
    } catch {
      return value;
    }
  };

  const suggestRename = (name: string) => {
    const raw = String(name || '').trim();
    if (!raw) return 'file (1)';
    const lastDot = raw.lastIndexOf('.');
    if (lastDot > 0 && lastDot < raw.length - 1) {
      const base = raw.slice(0, lastDot);
      const ext = raw.slice(lastDot);
      return `${base} (1)${ext}`;
    }
    return `${raw} (1)`;
  };

  const createFileWithName = (file: File, newName: string) => {
    return new File([file], newName, { type: file.type, lastModified: file.lastModified });
  };

  const uploadFilesWithDuplicateCheck = async (filesToUpload: File[], parentId?: string): Promise<boolean> => {
    if (!ensureAuth()) return false;
    if (!filesToUpload.length) return true;

    const list = await driveService.listFiles(token, parentId || undefined, 5000);
    if (!list?.success) {
      setError(list?.message || 'Failed to check existing files');
      return false;
    }

    const existingItems = (list?.data?.files || []) as any[];
    const existingFileByName = new Map<string, any>();
    for (const it of existingItems) {
      if (!it?.name) continue;
      if (it?.mimeType === 'application/vnd.google-apps.folder') continue;
      existingFileByName.set(String(it.name), it);
    }

    const firstConflict = filesToUpload.find((f) => existingFileByName.has(f.name));
    if (!firstConflict) {
      const res = await driveService.uploadFile(token, filesToUpload, parentId);
      if (!res?.success) {
        setError(res?.message || 'Failed to upload file');
        return false;
      }
      await loadDriveFiles();
      return true;
    }

    const existing = existingFileByName.get(firstConflict.name);
    setExistingFileId(String(existing?.id || ''));
    setExistingFileName(String(existing?.name || firstConflict.name));
    setRenameAndUploadFileValue(suggestRename(firstConflict.name));
    setPendingUploadFiles(filesToUpload);
    setPendingUploadParentId(parentId);
    setFileExistsOpen(true);
    return false;
  };

  const uploadDroppedFolderStructure = async (dropped: DroppedFile[], baseParentId?: string): Promise<boolean> => {
    if (!ensureAuth()) return false;
    if (!dropped.length) return false;

    const folderCache = new Map<string, string>();

    const firstRel = String(dropped[0]?.relativePath || dropped[0]?.file?.name || '');
    const rootName = firstRel.split('/').filter(Boolean)[0] || '';
    if (!rootName) {
      throw new Error('Failed to determine dropped folder name');
    }

    const rootCreate = await driveService.createFolder(token, rootName, baseParentId);
    if (!rootCreate?.success) {
      if (rootCreate?.status === 409) {
        const existing = (rootCreate as any)?.data?.existing;
        const existingId = existing?.id ? String(existing.id) : '';
        setDropExistingFolderId(existingId);
        setDropExistingFolderName(String(existing?.name || rootName));
        setDropRenameAndUploadValue(`${rootName} (1)`);
        setPendingDropFolderItems(dropped);
        setPendingDropBaseParentId(baseParentId);
        setDropFolderExistsOpen(true);
        return false;
      }
      throw new Error(rootCreate?.message || 'Failed to create folder');
    }

    const rootId = String(rootCreate.data?.id || '');
    if (!rootId) throw new Error('Folder create succeeded but id missing');

    const createOrReuseFolder = async (name: string, parentId?: string) => {
      const res = await driveService.createFolder(token, name, parentId);
      if (res?.success) return String(res.data?.id || '');
      if (res?.status === 409) {
        const existingId = (res as any)?.data?.existing?.id;
        if (existingId) return String(existingId);
      }
      throw new Error(res?.message || 'Failed to create folder');
    };

    const ensureFolderPath = async (parts: string[], parentId?: string) => {
      let currentParent = parentId;
      for (const part of parts) {
        const key = `${currentParent || 'root'}::${part}`;
        const cached = folderCache.get(key);
        if (cached) {
          currentParent = cached;
          continue;
        }
        const createdId = await createOrReuseFolder(part, currentParent);
        folderCache.set(key, createdId);
        currentParent = createdId;
      }
      return currentParent;
    };

    try {
      setIsUploading(true);
      setError('');

      const uploadsByParent = new Map<string, File[]>();

      for (const item of dropped) {
        const rel = String(item.relativePath || item.file.name);
        const parts = rel.split('/').filter(Boolean);

        const withoutRoot = parts.slice(1);
        const folderParts = withoutRoot.slice(0, Math.max(0, withoutRoot.length - 1));

        const targetParent = folderParts.length ? await ensureFolderPath(folderParts, rootId) : rootId;

        const key = targetParent || '';
        const existing = uploadsByParent.get(key) || [];
        existing.push(item.file);
        uploadsByParent.set(key, existing);
      }

      for (const [parentKey, filesToUpload] of uploadsByParent.entries()) {
        const res = await driveService.uploadFile(token, filesToUpload, parentKey || undefined);
        if (!res?.success) {
          throw new Error(res?.message || 'Failed to upload');
        }
      }

      setUploadFile([]);
      if (uploadInputRef.current) {
        uploadInputRef.current.value = '';
      }
      await loadDriveFiles();
    } finally {
      setIsUploading(false);
    }

    return true;
  };

  const uploadToFolderAction = async (folderId: string, files: File[]) => {
    if (!ensureAuth()) return;
    try {
      setError('');
      const result = await driveService.uploadFile(token, files, folderId);
      if (!result?.success) {
        setError(result?.message || 'Failed to upload file');
        return;
      }
      await loadDriveFiles();
    } catch (e: any) {
      setError(e?.message || 'Upload failed');
    }
  };

  const openDialog = (type: 'rename' | 'share' | 'delete', folderId: string, currentName: string) => {
    setDialogType(type);
    setDialogFolderId(folderId);
    setDialogFolderName(currentName);
    setDialogError('');
    setShareLink('');
    setShareEmail('');
    setRenameValue(currentName);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setDialogError('');
    setShareLink('');
  };

  const renameFolderAction = async (folderId: string, name: string) => {
    if (!ensureAuth()) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setDialogError('Name is required');
      return;
    }

    const result = await driveService.rename(token, folderId, trimmed);
    if (!result?.success) {
      setDialogError(result?.message || 'Failed to rename folder');
      return;
    }

    setDialogOpen(false);
    await loadDriveFiles();
  };

  const deleteFolderAction = async (folderId: string) => {
    if (!ensureAuth()) return;
    const result = await driveService.delete(token, folderId);
    if (!result?.success) {
      setDialogError(result?.message || 'Failed to delete folder');
      return;
    }

    setDialogOpen(false);
    await loadDriveFiles();
  };

  const shareFolderAction = async (folderId: string, email?: string) => {
    if (!ensureAuth()) return;
    const trimmed = (email || '').trim();
    const result = await driveService.share(token, folderId, trimmed || undefined);
    if (!result?.success) {
      setDialogError(result?.message || 'Failed to share folder');
      return;
    }
    const link = result?.data?.link;
    setShareLink(link || '');
  };

  const loadDriveFiles = async () => {
    if (!ensureAuth()) return;
    const result = await driveService.listFiles(token, undefined, 5000);
    if (!result?.success) {
      setError(result?.message || 'Failed to list Drive files');
      return;
    }

    const apiFiles = (result?.data?.files || []) as any[];
    const rows: FileRow[] = apiFiles.map((f) => ({
      name: f.name || f.id,
      type: mapMimeToType(f.mimeType),
      location: 'My Drive',
      owner: 'me',
      modified: toDisplayDate(f.modifiedTime),
      selected: false,
      id: f.id,
      mimeType: f.mimeType,
    })) as any;

    setFiles(rows);
  };

  const connectDrive = async () => {
    if (!ensureAuth()) return;
    setError('');
    const result = await driveService.getAuthUrl(token);
    if (!result?.success) {
      setError(result?.message || 'Failed to start Google Drive connection');
      return;
    }

    const url = result?.data?.url;
    if (!url) {
      setError('Auth URL missing from server response');
      return;
    }

    window.location.href = url;
  };

  const createFolderAction = async () => {
    if (!ensureAuth()) return;
    const name = folderName.trim();
    if (!name) {
      setError('Folder name is required');
      return;
    }

    setError('');
    const result = await driveService.createFolder(token, name);
    if (!result?.success) {
      if (result?.status === 409) {
        const existing = (result as any)?.data?.existing;
        if (existing?.id) {
          setExistingFolderId(existing.id);
          setExistingFolderName(existing.name || name);
          setRenameAndCreateValue(`${name} (1)`);
          setFolderExistsOpen(true);
          return;
        }
        setError(result?.message || 'Folder already exists');
        return;
      }
      setError(result?.message || 'Failed to create folder');
      return;
    }

    setFolderName('');
    await loadDriveFiles();
  };

  const uploadAction = async () => {
    if (!ensureAuth()) return;
    const picked = Array.from(uploadInputRef.current?.files || []);
    const fileToUpload = uploadFile.length ? uploadFile : picked;
    if (!fileToUpload.length) {
      setError('Choose a file first');
      return;
    }

    try {
      setIsUploading(true);
      setError('');
      const ok = await uploadFilesWithDuplicateCheck(fileToUpload);
      if (!ok) return;
      setUploadFile([]);
      if (uploadInputRef.current) {
        uploadInputRef.current.value = '';
      }
    } finally {
      setIsUploading(false);
    }
  };

  const downloadAction = async (fileId: string) => {
    if (!ensureAuth()) return;
    try {
      setError('');
      const { blob, filename } = await driveService.downloadFile(token, fileId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e?.message || 'Download failed');
    }
  };

  useEffect(() => {
    const run = async () => {
      setIsLoading(true);
      setError('');

      const result = await userService.profile(token);
      if (!result?.success) {
        if (result?.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          navigate('/login', { replace: true });
          return;
        }

        setError(result?.message || `Failed to load profile (HTTP ${result?.status ?? 'unknown'})`);
        setIsLoading(false);
        return;
      }

      setProfile(result?.data);
      const connected = await loadDriveStatus();

      const urlParams = new URLSearchParams(window.location.search);
      const driveParam = urlParams.get('drive');
      if (driveParam === 'connected') {
        await loadDriveFiles();
      }

      if (connected) {
        await loadDriveFiles();
      }
      setIsLoading(false);
    };

    run();
  }, [navigate]);

  const quickAccess = [
    { title: 'My projects', accent: 'bg-blue-500' },
    { title: 'Moodboards', accent: 'bg-blue-500' },
    { title: 'Inspirations', accent: 'bg-blue-500' }
  ];

  const folders = files.filter((f) => f.mimeType === 'application/vnd.google-apps.folder');

  const folderNameById = (id: string) => folders.find((f) => f.id === id)?.name || 'Folder';

  const suggested = [
    { title: 'Solving Product Design\nExercises: Questions…', badge: 'bg-yellow-500' },
    { title: 'Google Drive\nimprovements', badge: 'bg-blue-500' },
    { title: 'Review Checklist\nTemplate', badge: 'bg-green-500' },
    { title: 'How to create a case\nstudy', badge: 'bg-orange-300' }
  ];

  return (
    <div className="h-screen bg-[#F6F8FB] text-gray-900 flex flex-col overflow-hidden">
      <TopHeader
        user={profile}
        onLogout={() => {
          navigate('/login', { replace: true });
        }}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <div className="flex-1 min-w-0 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-6 pt-6">
            {isLoading ? (
              <div className="text-sm text-gray-600">Loading...</div>
            ) : null}

            {error ? (
              <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <div className="mb-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={connectDrive}
                className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                {driveConnected ? 'Reconnect Google Drive' : 'Connect Google Drive'}
              </button>

              <button
                type="button"
                onClick={async () => {
                  const connected = await loadDriveStatus();
                  if (connected) await loadDriveFiles();
                }}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Refresh
              </button>

              <div className="ml-auto text-xs text-gray-600">
                Drive: {driveConnected ? 'Connected' : 'Not connected'}
              </div>
            </div>

            {driveConnected ? (
              <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-gray-200 bg-white p-3">
                  <div className="text-xs font-semibold text-gray-600">Create Folder</div>
                  <div className="mt-2 flex gap-2">
                    <input
                      value={folderName}
                      onChange={(e) => setFolderName(e.target.value)}
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      placeholder="Folder name"
                    />
                    <button
                      type="button"
                      onClick={createFolderAction}
                      className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-black"
                    >
                      Create
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-3">
                  <div className="text-xs font-semibold text-gray-600">Upload File</div>
                  <div
                    className={`mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-dashed px-2 py-2 ${
                      isUploadDragOver ? 'border-blue-400 bg-blue-50' : 'border-transparent'
                    }`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsUploadDragOver(true);
                    }}
                    onDragLeave={() => setIsUploadDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsUploadDragOver(false);
                      (async () => {
                        if (!ensureAuth()) return;
                        const dropped = await getDroppedFiles(e.dataTransfer);
                        const folderFiles = dropped.filter((d) => d.relativePath.includes('/'));
                        const looseFiles = dropped.filter((d) => !d.relativePath.includes('/'));

                        if (folderFiles.length && looseFiles.length) {
                          setDropFolderFiles(folderFiles);
                          setDropLooseFiles(looseFiles);
                          setDropChoiceOpen(true);
                          return;
                        }

                        if (folderFiles.length) {
                          await uploadDroppedFolderStructure(folderFiles);
                          return;
                        }

                        const files = looseFiles.map((d) => d.file);
                        if (!files.length) return;
                        setUploadFile(files);
                        await uploadFilesWithDuplicateCheck(files);
                      })().catch((err: any) => {
                        setError(err?.message || 'Failed to read dropped folder');
                      });
                    }}
                  >
                    <input
                      type="file"
                      multiple
                      ref={uploadInputRef}
                      onChange={(e) => setUploadFile(Array.from(e.target.files || []))}
                      className="text-sm"
                    />
                    <div className="text-xs text-gray-600">
                      {uploadFile.length ? `Selected: ${uploadFile.length} file(s)` : 'No file selected'}
                    </div>
                    {isUploadDragOver ? (
                      <div className="text-xs text-blue-700">Drop files or a folder here</div>
                    ) : null}
                    <button
                      type="button"
                      onClick={uploadAction}
                      disabled={isUploading || !(uploadFile.length || uploadInputRef.current?.files?.length)}
                      className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-black"
                    >
                      {isUploading ? 'Uploading...' : 'Upload'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mb-4 rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
                Connect Google Drive to view your files.
              </div>
            )}
          </div>

          {driveConnected ? (
            <FolderContainer
              folders={folders}
              onDownload={downloadAction}
              onUploadToFolder={uploadToFolderAction}
              onShare={(folderId) => openDialog('share', folderId, folderNameById(folderId))}
              onRename={(folderId, currentName) => openDialog('rename', folderId, currentName)}
              onDelete={(folderId, currentName) => openDialog('delete', folderId, currentName)}
            />
          ) : null}

          <PopupCard
            open={dialogOpen}
            title={
              dialogType === 'rename' ? 'Rename folder' : dialogType === 'share' ? 'Share folder' : 'Delete folder'
            }
            onClose={closeDialog}
            footer={
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeDialog}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>

                {dialogType === 'rename' ? (
                  <button
                    type="button"
                    onClick={() => renameFolderAction(dialogFolderId, renameValue)}
                    className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-black"
                  >
                    Save
                  </button>
                ) : null}

                {dialogType === 'share' ? (
                  <button
                    type="button"
                    onClick={() => shareFolderAction(dialogFolderId, shareEmail)}
                    className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-black"
                  >
                    Generate link
                  </button>
                ) : null}

                {dialogType === 'delete' ? (
                  <button
                    type="button"
                    onClick={() => deleteFolderAction(dialogFolderId)}
                    className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
                  >
                    Delete
                  </button>
                ) : null}
              </div>
            }
          >
            <div className="text-sm text-gray-900 font-medium truncate">{dialogFolderName}</div>

            {dialogType === 'rename' ? (
              <div className="mt-3">
                <div className="text-xs font-semibold text-gray-600">New name</div>
                <input
                  value={renameValue}
                  onChange={(e) => {
                    setDialogError('');
                    setRenameValue(e.target.value);
                  }}
                  className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  placeholder="Enter new name"
                />
              </div>
            ) : null}

            {dialogType === 'share' ? (
              <div className="mt-3">
                <div className="text-xs font-semibold text-gray-600">Email (optional)</div>
                <input
                  value={shareEmail}
                  onChange={(e) => {
                    setDialogError('');
                    setShareEmail(e.target.value);
                  }}
                  className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  placeholder="someone@example.com"
                />

                {shareLink ? (
                  <div className="mt-4">
                    <div className="text-xs font-semibold text-gray-600">Share link</div>
                    <div className="mt-2 flex gap-2">
                      <input
                        value={shareLink}
                        readOnly
                        className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(shareLink);
                          } catch {
                            setDialogError('Failed to copy');
                          }
                        }}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {dialogType === 'delete' ? (
              <div className="mt-3 text-sm text-gray-700">Are you sure you want to delete this folder?</div>
            ) : null}

            {dialogError ? (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {dialogError}
              </div>
            ) : null}
          </PopupCard>

          <PopupCard
            open={fileExistsOpen}
            title="File already exists"
            onClose={() => {
              setFileExistsOpen(false);
              setExistingFileId('');
              setExistingFileName('');
              setRenameAndUploadFileValue('');
              setPendingUploadFiles([]);
              setPendingUploadParentId(undefined);
            }}
            footer={
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFileExistsOpen(false);
                    setExistingFileId('');
                    setExistingFileName('');
                    setRenameAndUploadFileValue('');
                    setPendingUploadFiles([]);
                    setPendingUploadParentId(undefined);
                  }}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const existingId = existingFileId;
                    const queue = pendingUploadFiles;
                    const parentId = pendingUploadParentId;
                    if (!existingId || !queue.length) return;
                    const current = queue[0];
                    const rest = queue.slice(1);

                    setFileExistsOpen(false);
                    setPendingUploadFiles([]);

                    try {
                      setIsUploading(true);
                      setError('');

                      const delRes = await driveService.delete(token, existingId);
                      if (!delRes?.success) throw new Error(delRes?.message || 'Failed to delete existing file');

                      const upRes = await driveService.uploadFile(token, current, parentId);
                      if (!upRes?.success) throw new Error(upRes?.message || 'Failed to upload file');

                      await loadDriveFiles();
                    } catch (e: any) {
                      setError(e?.message || 'Upload failed');
                      return;
                    } finally {
                      setIsUploading(false);
                      setExistingFileId('');
                      setExistingFileName('');
                      setRenameAndUploadFileValue('');
                      setPendingUploadParentId(undefined);
                    }

                    if (rest.length) {
                      await uploadFilesWithDuplicateCheck(rest, parentId);
                    }
                  }}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Replace
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const queue = pendingUploadFiles;
                    const parentId = pendingUploadParentId;
                    const nextName = renameAndUploadFileValue.trim();
                    if (!queue.length || !nextName) return;
                    const current = createFileWithName(queue[0], nextName);
                    const rest = queue.slice(1);

                    setFileExistsOpen(false);
                    setPendingUploadFiles([]);

                    try {
                      setIsUploading(true);
                      setError('');

                      const upRes = await driveService.uploadFile(token, current, parentId);
                      if (!upRes?.success) throw new Error(upRes?.message || 'Failed to upload file');

                      await loadDriveFiles();
                    } catch (e: any) {
                      setError(e?.message || 'Upload failed');
                      return;
                    } finally {
                      setIsUploading(false);
                      setExistingFileId('');
                      setExistingFileName('');
                      setRenameAndUploadFileValue('');
                      setPendingUploadParentId(undefined);
                    }

                    if (rest.length) {
                      await uploadFilesWithDuplicateCheck(rest, parentId);
                    }
                  }}
                  className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-black"
                >
                  Rename & upload
                </button>
              </div>
            }
          >
            <div className="text-sm text-gray-900 font-medium truncate">{existingFileName}</div>
            <div className="mt-2 text-sm text-gray-700">A file with this name already exists. What do you want to do?</div>
            <div className="mt-4">
              <div className="text-xs font-semibold text-gray-600">New file name</div>
              <input
                value={renameAndUploadFileValue}
                onChange={(e) => setRenameAndUploadFileValue(e.target.value)}
                className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="Enter a new name"
              />
            </div>
          </PopupCard>

          <PopupCard
            open={dropFolderExistsOpen}
            title="Folder already exists"
            onClose={() => {
              setDropFolderExistsOpen(false);
              setDropExistingFolderId('');
              setDropExistingFolderName('');
              setDropRenameAndUploadValue('');
              setPendingDropFolderItems([]);
              setPendingDropBaseParentId(undefined);
              setPendingDropLooseItems([]);
            }}
            footer={
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDropFolderExistsOpen(false);
                    setDropExistingFolderId('');
                    setDropExistingFolderName('');
                    setDropRenameAndUploadValue('');
                    setPendingDropFolderItems([]);
                    setPendingDropBaseParentId(undefined);
                    setPendingDropLooseItems([]);
                  }}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const existingId = dropExistingFolderId;
                    const existingName = dropExistingFolderName;
                    const dropped = pendingDropFolderItems;
                    const baseParentId = pendingDropBaseParentId;
                    const looseItems = pendingDropLooseItems;
                    if (!existingId || !dropped.length) return;
                    setDropFolderExistsOpen(false);
                    setPendingDropFolderItems([]);
                    setPendingDropLooseItems([]);

                    const rootName = existingName || String((dropped[0]?.relativePath || '').split('/').filter(Boolean)[0] || '');

                    const folderCache = new Map<string, string>();

                    const createOrReuseFolder = async (name: string, parentId?: string) => {
                      const res = await driveService.createFolder(token, name, parentId);
                      if (res?.success) return String(res.data?.id || '');
                      if (res?.status === 409) {
                        const reuseId = (res as any)?.data?.existing?.id;
                        if (reuseId) return String(reuseId);
                      }
                      throw new Error(res?.message || 'Failed to create folder');
                    };

                    const ensureFolderPath = async (parts: string[], parentId?: string) => {
                      let currentParent = parentId;
                      for (const part of parts) {
                        const key = `${currentParent || 'root'}::${part}`;
                        const cached = folderCache.get(key);
                        if (cached) {
                          currentParent = cached;
                          continue;
                        }
                        const createdId = await createOrReuseFolder(part, currentParent);
                        folderCache.set(key, createdId);
                        currentParent = createdId;
                      }
                      return currentParent;
                    };

                    try {
                      setIsUploading(true);
                      setError('');

                      const delRes = await driveService.delete(token, existingId);
                      if (!delRes?.success) {
                        throw new Error(delRes?.message || 'Failed to delete existing folder');
                      }

                      let recreatedId = '';
                      for (let attempt = 0; attempt < 5; attempt++) {
                        const created = await driveService.createFolder(token, rootName, baseParentId);
                        if (created?.success) {
                          recreatedId = String(created.data?.id || '');
                          break;
                        }
                        if (created?.status === 409) {
                          await new Promise((r) => setTimeout(r, 500));
                          continue;
                        }
                        throw new Error(created?.message || 'Failed to create folder');
                      }

                      if (!recreatedId) throw new Error('Failed to recreate folder');

                      const uploadsByParent = new Map<string, File[]>();

                      for (const item of dropped) {
                        const rel = String(item.relativePath || item.file.name);
                        const parts = rel.split('/').filter(Boolean);
                        const withoutRoot = parts.slice(1);
                        const folderParts = withoutRoot.slice(0, Math.max(0, withoutRoot.length - 1));
                        const targetParent = folderParts.length
                          ? await ensureFolderPath(folderParts, recreatedId)
                          : recreatedId;
                        const key = targetParent || '';
                        const existing = uploadsByParent.get(key) || [];
                        existing.push(item.file);
                        uploadsByParent.set(key, existing);
                      }

                      for (const [parentKey, filesToUpload] of uploadsByParent.entries()) {
                        const res = await driveService.uploadFile(token, filesToUpload, parentKey || undefined);
                        if (!res?.success) throw new Error(res?.message || 'Failed to upload');
                      }

                      const looseFiles = looseItems.map((d) => d.file);
                      if (looseFiles.length) {
                        const res = await driveService.uploadFile(token, looseFiles);
                        if (!res?.success) throw new Error(res?.message || 'Failed to upload');
                      }

                      await loadDriveFiles();
                    } catch (e: any) {
                      setError(e?.message || 'Upload failed');
                    } finally {
                      setIsUploading(false);
                      setDropExistingFolderId('');
                      setDropExistingFolderName('');
                      setDropRenameAndUploadValue('');
                      setPendingDropBaseParentId(undefined);
                      setPendingDropLooseItems([]);
                    }
                  }}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Use existing
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const nextName = dropRenameAndUploadValue.trim();
                    const dropped = pendingDropFolderItems;
                    const baseParentId = pendingDropBaseParentId;
                    const looseItems = pendingDropLooseItems;
                    if (!nextName || !dropped.length) return;
                    setDropFolderExistsOpen(false);
                    setPendingDropFolderItems([]);
                    setPendingDropLooseItems([]);
                    try {
                      setIsUploading(true);
                      setError('');
                      const created = await driveService.createFolder(token, nextName, baseParentId);
                      if (!created?.success) throw new Error(created?.message || 'Failed to create folder');
                      const rootId = String(created.data?.id || '');
                      if (!rootId) throw new Error('Folder create succeeded but id missing');

                      const folderCache = new Map<string, string>();
                      const createOrReuseFolder = async (name: string, parentId?: string) => {
                        const res = await driveService.createFolder(token, name, parentId);
                        if (res?.success) return String(res.data?.id || '');
                        if (res?.status === 409) {
                          const reuseId = (res as any)?.data?.existing?.id;
                          if (reuseId) return String(reuseId);
                        }
                        throw new Error(res?.message || 'Failed to create folder');
                      };

                      const ensureFolderPath = async (parts: string[], parentId?: string) => {
                        let currentParent = parentId;
                        for (const part of parts) {
                          const key = `${currentParent || 'root'}::${part}`;
                          const cached = folderCache.get(key);
                          if (cached) {
                            currentParent = cached;
                            continue;
                          }
                          const createdId = await createOrReuseFolder(part, currentParent);
                          folderCache.set(key, createdId);
                          currentParent = createdId;
                        }
                        return currentParent;
                      };

                      const uploadsByParent = new Map<string, File[]>();

                      for (const item of dropped) {
                        const rel = String(item.relativePath || item.file.name);
                        const parts = rel.split('/').filter(Boolean);
                        const withoutRoot = parts.slice(1);
                        const folderParts = withoutRoot.slice(0, Math.max(0, withoutRoot.length - 1));
                        const targetParent = folderParts.length ? await ensureFolderPath(folderParts, rootId) : rootId;
                        const key = targetParent || '';
                        const existing = uploadsByParent.get(key) || [];
                        existing.push(item.file);
                        uploadsByParent.set(key, existing);
                      }

                      for (const [parentKey, filesToUpload] of uploadsByParent.entries()) {
                        const res = await driveService.uploadFile(token, filesToUpload, parentKey || undefined);
                        if (!res?.success) throw new Error(res?.message || 'Failed to upload');
                      }

                      const looseFiles = looseItems.map((d) => d.file);
                      if (looseFiles.length) {
                        const res = await driveService.uploadFile(token, looseFiles);
                        if (!res?.success) throw new Error(res?.message || 'Failed to upload');
                      }

                      await loadDriveFiles();
                    } catch (e: any) {
                      setError(e?.message || 'Upload failed');
                    } finally {
                      setIsUploading(false);
                      setDropExistingFolderId('');
                      setDropExistingFolderName('');
                      setDropRenameAndUploadValue('');
                      setPendingDropBaseParentId(undefined);
                      setPendingDropLooseItems([]);
                    }
                  }}
                  className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-black"
                >
                  Rename & upload
                </button>
              </div>
            }
          >
            <div className="text-sm text-gray-900 font-medium truncate">{dropExistingFolderName}</div>
            <div className="mt-2 text-sm text-gray-700">A folder with this name already exists. What do you want to do?</div>
            <div className="mt-4">
              <div className="text-xs font-semibold text-gray-600">New folder name</div>
              <input
                value={dropRenameAndUploadValue}
                onChange={(e) => setDropRenameAndUploadValue(e.target.value)}
                className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="Enter a new name"
              />
            </div>
          </PopupCard>

          <PopupCard
            open={folderExistsOpen}
            title="Folder already exists"
            onClose={() => {
              setFolderExistsOpen(false);
              setExistingFolderId('');
              setExistingFolderName('');
              setRenameAndCreateValue('');
            }}
            footer={
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFolderExistsOpen(false);
                    setExistingFolderId('');
                    setExistingFolderName('');
                    setRenameAndCreateValue('');
                  }}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!existingFolderId) return;
                    setFolderExistsOpen(false);
                    navigate(`/folders/${existingFolderId}`, {
                      state: { folderName: existingFolderName || 'Folder' },
                    });
                  }}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Use existing
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    const nextName = renameAndCreateValue.trim();
                    if (!nextName) {
                      setError('Folder name is required');
                      return;
                    }
                    setFolderExistsOpen(false);
                    setFolderName(nextName);
                    const res = await driveService.createFolder(token, nextName);
                    if (!res?.success) {
                      setError(res?.message || 'Failed to create folder');
                      return;
                    }
                    setFolderName('');
                    await loadDriveFiles();
                  }}
                  className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-black"
                >
                  Rename & create
                </button>
              </div>
            }
          >
            <div className="text-sm text-gray-900 font-medium truncate">{existingFolderName}</div>
            <div className="mt-2 text-sm text-gray-700">
              A folder with this name already exists. What do you want to do?
            </div>

            <div className="mt-4">
              <div className="text-xs font-semibold text-gray-600">New folder name</div>
              <input
                value={renameAndCreateValue}
                onChange={(e) => setRenameAndCreateValue(e.target.value)}
                className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="Enter a new name"
              />
            </div>
          </PopupCard>

          <PopupCard
            open={dropChoiceOpen}
            title="Upload selection"
            onClose={() => {
              setDropChoiceOpen(false);
              setDropFolderFiles([]);
              setDropLooseFiles([]);
            }}
            footer={
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDropChoiceOpen(false);
                    setDropFolderFiles([]);
                    setDropLooseFiles([]);
                  }}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const files = dropLooseFiles.map((d) => d.file);
                    setDropChoiceOpen(false);
                    setDropFolderFiles([]);
                    setDropLooseFiles([]);
                    if (!files.length) return;
                    setUploadFile(files);
                    await uploadFilesWithDuplicateCheck(files);
                  }}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Upload files
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const files = dropFolderFiles;
                    setDropChoiceOpen(false);
                    setDropFolderFiles([]);
                    setDropLooseFiles([]);
                    if (!files.length) return;
                    await uploadDroppedFolderStructure(files);
                  }}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Upload folder
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const folderItems = dropFolderFiles;
                    const looseItems = dropLooseFiles;
                    setDropChoiceOpen(false);
                    setDropFolderFiles([]);
                    setDropLooseFiles([]);
                    if (!folderItems.length && !looseItems.length) return;
                    setPendingDropLooseItems(looseItems);
                    if (folderItems.length) {
                      const didUploadFolder = await uploadDroppedFolderStructure(folderItems);
                      if (!didUploadFolder) return;
                    }
                    const looseFiles = looseItems.map((d) => d.file);
                    if (looseFiles.length) {
                      setUploadFile(looseFiles);
                      await uploadFilesWithDuplicateCheck(looseFiles);
                    }
                    setPendingDropLooseItems([]);
                  }}
                  className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-black"
                >
                  Upload both
                </button>
              </div>
            }
          >
            <div className="text-sm text-gray-700">Your drop contains a folder and also individual files.</div>
            <div className="mt-3 text-xs text-gray-600">Folder files: {dropFolderFiles.length}</div>
            <div className="mt-1 text-xs text-gray-600">Individual files: {dropLooseFiles.length}</div>
          </PopupCard>

          <MainSection
            quickAccess={quickAccess}
            suggested={suggested}
            files={files.map((f: any) => ({
              ...f,
              name: f.id ? `${f.name}` : f.name,
            }))}
          />

          {driveConnected && files.length ? (
            <div className="max-w-6xl mx-auto px-6 pb-6">
              <div className="mt-3 rounded-xl border border-gray-200 bg-white p-3">
                <div className="text-xs font-semibold text-gray-600">Download</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {files.slice(0, 10).map((f: any) => (
                    <button
                      key={f.id || f.name}
                      type="button"
                      onClick={() => f.id && downloadAction(f.id)}
                      disabled={!f.id}
                      className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      {f.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
export default Dashboard;
