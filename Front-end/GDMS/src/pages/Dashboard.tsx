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
      const result = await driveService.uploadFile(token, fileToUpload);
      if (!result?.success) {
        setError(result?.message || 'Failed to upload file');
        return;
      }
      setUploadFile([]);
      if (uploadInputRef.current) {
        uploadInputRef.current.value = '';
      }
      await loadDriveFiles();
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
                  <div className="mt-2 flex flex-wrap items-center gap-2">
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
