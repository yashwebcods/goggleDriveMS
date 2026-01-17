import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import Sidebar from '../components/dashboard/Sidebar';
import TopHeader from '../components/dashboard/TopHeader';
import type { FileRow } from '../components/dashboard/types';
import { driveService } from '../services/drive.services';
import PopupCard from '../components/PopupCard';

type LocationState = {
  folderName?: string;
};

type DialogType = 'rename' | 'share' | 'delete';

const safeParseJson = (value: string | null): any | null => {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const FolderDetail = () => {
  const { folderId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const token = localStorage.getItem('token') || '';
  const user = useMemo(() => safeParseJson(localStorage.getItem('user')), []);

  const state = (location.state || {}) as LocationState;
  const folderName = state.folderName || 'Folder';

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [items, setItems] = useState<FileRow[]>([]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<DialogType>('rename');
  const [dialogFileId, setDialogFileId] = useState<string>('');
  const [dialogFileName, setDialogFileName] = useState<string>('');
  const [dialogError, setDialogError] = useState<string>('');
  const [renameValue, setRenameValue] = useState<string>('');
  const [shareEmail, setShareEmail] = useState<string>('');
  const [shareLink, setShareLink] = useState<string>('');

  const ensureAuth = () => {
    if (!token) {
      navigate('/login', { replace: true });
      return false;
    }
    return true;
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

  const loadItems = async () => {
    if (!ensureAuth()) return;
    if (!folderId) {
      setError('Folder id missing in URL');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError('');

    const result = await driveService.listFiles(token, folderId, 5000);
    if (!result?.success) {
      if (result?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login', { replace: true });
        return;
      }
      setError(result?.message || 'Failed to list folder files');
      setIsLoading(false);
      return;
    }

    const apiFiles = (result?.data?.files || []) as any[];
    const rows: FileRow[] = apiFiles.map((f) => ({
      name: f.name || f.id,
      type: mapMimeToType(f.mimeType),
      location: folderName,
      owner: 'me',
      modified: toDisplayDate(f.modifiedTime),
      selected: false,
      id: f.id,
      mimeType: f.mimeType,
    }));

    setItems(rows);
    setIsLoading(false);
  };

  const uploadToThisFolder = async (filesToUpload: File[]) => {
    if (!ensureAuth()) return;
    if (!folderId) return;
    if (!filesToUpload.length) return;

    try {
      setIsUploading(true);
      setError('');
      const result = await driveService.uploadFile(token, filesToUpload, folderId);
      if (!result?.success) {
        setError(result?.message || 'Failed to upload file');
        return;
      }
      await loadItems();
    } catch (e: any) {
      setError(e?.message || 'Upload failed');
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

  const renameAction = async (fileId: string, name: string) => {
    if (!ensureAuth()) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setDialogError('Name is required');
      return;
    }

    const result = await driveService.rename(token, fileId, trimmed);
    if (!result?.success) {
      setDialogError(result?.message || 'Failed to rename');
      return;
    }

    setDialogOpen(false);
    await loadItems();
  };

  const deleteAction = async (fileId: string) => {
    if (!ensureAuth()) return;

    const result = await driveService.delete(token, fileId);
    if (!result?.success) {
      setDialogError(result?.message || 'Failed to delete');
      return;
    }

    setDialogOpen(false);
    await loadItems();
  };

  const shareAction = async (fileId: string, email?: string) => {
    if (!ensureAuth()) return;
    const trimmed = (email || '').trim();
    const result = await driveService.share(token, fileId, trimmed || undefined);
    if (!result?.success) {
      setDialogError(result?.message || 'Failed to share');
      return;
    }
    const link = result?.data?.link;
    setShareLink(link || '');
  };

  const openDialog = (type: DialogType, fileId: string, fileName: string) => {
    setDialogType(type);
    setDialogFileId(fileId);
    setDialogFileName(fileName);
    setDialogError('');
    setShareLink('');
    setShareEmail('');
    setRenameValue(fileName);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setDialogError('');
    setShareLink('');
  };

  useEffect(() => {
    const run = async () => {
      await loadItems();
    };

    run();
  }, [folderId, folderName, navigate]);

  return (
    <div className="h-screen bg-[#F6F8FB] text-gray-900 flex flex-col overflow-hidden">
      <TopHeader
        user={user}
        onLogout={() => {
          navigate('/login', { replace: true });
        }}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <div className="flex-1 min-w-0 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-6 pt-6">
            <div className="mb-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Back
              </button>
              <div className="text-sm text-gray-700">
                {folderName}
              </div>
            </div>

            {isLoading ? <div className="text-sm text-gray-600">Loading...</div> : null}

            {error ? (
              <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
            ) : null}

            {!isLoading && !error ? (
              <div
                className={`rounded-xl border bg-white p-3 ${
                  isDragOver ? 'border-blue-400 ring-2 ring-blue-100' : 'border-gray-200'
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDragOver(false);
                  const dropped = Array.from(e.dataTransfer?.files || []);
                  if (!dropped.length) return;
                  uploadToThisFolder(dropped);
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-gray-600">Files in folder</div>
                  <div className="text-xs text-gray-400">{items.length}</div>
                </div>

                {isDragOver ? (
                  <div className="mt-2 text-xs text-blue-700">Drop files to upload into this folder</div>
                ) : null}

                {isUploading ? <div className="mt-2 text-xs text-gray-600">Uploading...</div> : null}

                {items.length ? (
                  <div className="mt-3 bg-white border border-gray-100 rounded-xl shadow-sm overflow-visible">
                    <div className="grid grid-cols-12 px-4 py-3 text-[11px] text-gray-500">
                      <div className="col-span-5">Name</div>
                      <div className="col-span-2">Type</div>
                      <div className="col-span-2">Last modified</div>
                      <div className="col-span-3 text-right">Actions</div>
                    </div>
                    <div className="h-px bg-gray-100" />
                    {items.map((f, idx) => (
                      <div
                        key={f.id || `${f.name}-${idx}`}
                        className="grid grid-cols-12 px-4 py-3 text-sm items-center border-t border-gray-50 bg-white relative"
                      >
                        <div className="col-span-5 min-w-0">
                          <div className="truncate text-gray-800">{f.name}</div>
                        </div>
                        <div className="col-span-2 text-xs text-gray-600">
                          {f.mimeType === 'application/vnd.google-apps.folder' ? 'folder' : f.type}
                        </div>
                        <div className="col-span-2 text-xs text-gray-600">{f.modified}</div>
                        <div className="col-span-3 flex justify-end relative">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!f.id) return;
                              setOpenMenuId(openMenuId === f.id ? null : f.id);
                            }}
                            disabled={!f.id}
                            className="shrink-0 rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                            aria-label="File actions"
                          >
                            ...
                          </button>
                        </div>

                        {openMenuId && openMenuId === f.id ? (
                          <div className="absolute right-0 top-full mt-2 z-20 w-44 rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!f.id) return;
                                setOpenMenuId(null);
                                downloadAction(f.id);
                              }}
                              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                            >
                              Download
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!f.id) return;
                                setOpenMenuId(null);
                                openDialog('rename', f.id, f.name);
                              }}
                              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                            >
                              Rename
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!f.id) return;
                                setOpenMenuId(null);
                                openDialog('share', f.id, f.name);
                              }}
                              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                            >
                              Share
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!f.id) return;
                                setOpenMenuId(null);
                                openDialog('delete', f.id, f.name);
                              }}
                              className="w-full px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50"
                            >
                              Delete
                            </button>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-3 text-sm text-gray-600">No files found.</div>
                )}
              </div>
            ) : null}

            <PopupCard
              open={dialogOpen}
              title={
                dialogType === 'rename'
                  ? 'Rename'
                  : dialogType === 'share'
                    ? 'Share'
                    : 'Delete'
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
                      onClick={() => renameAction(dialogFileId, renameValue)}
                      className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-black"
                    >
                      Save
                    </button>
                  ) : null}

                  {dialogType === 'share' ? (
                    <button
                      type="button"
                      onClick={() => shareAction(dialogFileId, shareEmail)}
                      className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-black"
                    >
                      Generate link
                    </button>
                  ) : null}

                  {dialogType === 'delete' ? (
                    <button
                      type="button"
                      onClick={() => deleteAction(dialogFileId)}
                      className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
                    >
                      Delete
                    </button>
                  ) : null}
                </div>
              }
            >
              <div className="text-sm text-gray-900 font-medium truncate">{dialogFileName}</div>

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
                <div className="mt-3 text-sm text-gray-700">
                  Are you sure you want to delete this file?
                </div>
              ) : null}

              {dialogError ? (
                <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {dialogError}
                </div>
              ) : null}
            </PopupCard>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FolderDetail;
