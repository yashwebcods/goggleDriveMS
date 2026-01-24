import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import Sidebar from '../components/dashboard/Sidebar';
import TopHeader from '../components/dashboard/TopHeader';
import type { FileRow } from '../components/dashboard/types';
import { driveService } from '../services/drive.services';
import PopupCard from '../components/PopupCard';
import { getDroppedFiles, type DroppedFile } from '../utils/dragDropFolders';

type LocationState = {
  folderName?: string;
  fromShared?: boolean;
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
  const fromShared = Boolean(state.fromShared);

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [items, setItems] = useState<FileRow[]>([]);
  const [itemsNextPageToken, setItemsNextPageToken] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
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

  const [dropChoiceOpen, setDropChoiceOpen] = useState(false);
  const [dropFolderFiles, setDropFolderFiles] = useState<DroppedFile[]>([]);
  const [dropLooseFiles, setDropLooseFiles] = useState<DroppedFile[]>([]);

  const [dropFolderExistsOpen, setDropFolderExistsOpen] = useState(false);
  const [dropExistingFolderId, setDropExistingFolderId] = useState<string>('');
  const [dropExistingFolderName, setDropExistingFolderName] = useState<string>('');
  const [dropRenameAndUploadValue, setDropRenameAndUploadValue] = useState<string>('');
  const [pendingDropFolderItems, setPendingDropFolderItems] = useState<DroppedFile[]>([]);
  const [pendingDropLooseItems, setPendingDropLooseItems] = useState<DroppedFile[]>([]);

  const [fileExistsOpen, setFileExistsOpen] = useState(false);
  const [existingFileId, setExistingFileId] = useState<string>('');
  const [existingFileName, setExistingFileName] = useState<string>('');
  const [renameAndUploadFileValue, setRenameAndUploadFileValue] = useState<string>('');
  const [pendingUploadFiles, setPendingUploadFiles] = useState<File[]>([]);

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

  const buildExistingFileIdByName = async (parentId?: string) => {
    const fileIdByName = new Map<string, string>();
    let pageToken: string | undefined = undefined;

    while (true) {
      const list = await driveService.listFiles(token, parentId || undefined, 1000, undefined, !fromShared, pageToken);
      if (!list?.success) {
        throw new Error(list?.message || 'Failed to check existing files');
      }
      const existingItems = (list?.data?.files || []) as any[];
      for (const it of existingItems) {
        if (!it?.id || !it?.name) continue;
        if (it?.mimeType === 'application/vnd.google-apps.folder') continue;
        const name = String(it.name);
        if (!fileIdByName.has(name)) fileIdByName.set(name, String(it.id));
      }
      const next = (list?.data?.nextPageToken || null) as string | null;
      if (!next) break;
      pageToken = String(next);
    }

    return fileIdByName;
  };

  const uploadFilesWithOverwriteByName = async (filesToUpload: File[], parentId?: string) => {
    if (!filesToUpload.length) return;

    const existingByName = await buildExistingFileIdByName(parentId);
    const newFiles: File[] = [];

    for (const f of filesToUpload) {
      const existingId = existingByName.get(f.name);
      if (existingId) {
        const res = await driveService.overwriteFile(token, existingId, f);
        if (!res?.success) throw new Error(res?.message || 'Failed to overwrite file');
      } else {
        newFiles.push(f);
      }
    }

    if (newFiles.length) {
      const batchSize = 20;
      for (let i = 0; i < newFiles.length; i += batchSize) {
        const res = await driveService.uploadFile(token, newFiles.slice(i, i + batchSize), parentId);
        if (!res?.success) throw new Error(res?.message || 'Failed to upload');
      }
    }
  };

  const uploadDroppedFolderStructure = async (dropped: DroppedFile[]): Promise<boolean> => {
    if (!ensureAuth()) return false;
    if (!folderId) return false;
    if (!dropped.length) return false;

    const folderCache = new Map<string, string>();

    const firstRel = String(dropped[0]?.relativePath || dropped[0]?.file?.name || '');
    const rootName = firstRel.split('/').filter(Boolean)[0] || '';
    if (!rootName) {
      throw new Error('Failed to determine dropped folder name');
    }

    const rootCreate = await driveService.createFolder(token, rootName, folderId);
    if (!rootCreate?.success) {
      if (rootCreate?.status === 409) {
        const existing = (rootCreate as any)?.data?.existing;
        const existingId = existing?.id ? String(existing.id) : '';
        setDropExistingFolderId(existingId);
        setDropExistingFolderName(String(existing?.name || rootName));
        setDropRenameAndUploadValue(`${rootName} (1)`);
        setPendingDropFolderItems(dropped);
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

      const batches: Array<{ parentId?: string; files: File[] }> = [];
      const batchSize = 20;
      for (const [parentKey, filesToUpload] of uploadsByParent.entries()) {
        for (let i = 0; i < filesToUpload.length; i += batchSize) {
          batches.push({
            parentId: parentKey || undefined,
            files: filesToUpload.slice(i, i + batchSize),
          });
        }
      }

      for (const batch of batches) {
        await uploadFilesWithOverwriteByName(batch.files, batch.parentId);
      }

      await loadItems();
    } catch (e: any) {
      setError(e?.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }

    return true;
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
    setItemsNextPageToken(null);

    const result = await driveService.listFiles(token, folderId, 200, undefined, !fromShared);
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
      owner:
        f?.uploadedByEmail ||
        f?.createdBy?.emailAddress ||
        (Array.isArray(f?.owners) ? f.owners[0]?.emailAddress : undefined) ||
        f?.owner?.email ||
        f?.ownerEmail ||
        '—',
      modified: toDisplayDate(f.modifiedTime),
      selected: false,
      id: f.id,
      mimeType: f.mimeType,
    }));

    setItems(rows);
    setItemsNextPageToken((result?.data?.nextPageToken || null) as string | null);
    setIsLoading(false);
  };

  const loadMoreItems = async () => {
    if (!ensureAuth()) return;
    if (!folderId) return;
    if (!itemsNextPageToken) return;

    try {
      setIsLoadingMore(true);
      const result = await driveService.listFiles(token, folderId, 200, undefined, !fromShared, itemsNextPageToken);
      if (!result?.success) {
        if (result?.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          navigate('/login', { replace: true });
          return;
        }
        setError(result?.message || 'Failed to load more files');
        return;
      }

      const apiFiles = (result?.data?.files || []) as any[];
      const rows: FileRow[] = apiFiles.map((f) => ({
        name: f.name || f.id,
        type: mapMimeToType(f.mimeType),
        location: folderName,
        owner:
          f?.uploadedByEmail ||
          f?.createdBy?.emailAddress ||
          (Array.isArray(f?.owners) ? f.owners[0]?.emailAddress : undefined) ||
          f?.owner?.email ||
          f?.ownerEmail ||
          '—',
        modified: toDisplayDate(f.modifiedTime),
        selected: false,
        id: f.id,
        mimeType: f.mimeType,
      }));

      setItems((prev) => prev.concat(rows));
      setItemsNextPageToken((result?.data?.nextPageToken || null) as string | null);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const uploadToThisFolder = async (filesToUpload: File[]) => {
    if (!ensureAuth()) return;
    if (!folderId) return;
    if (!filesToUpload.length) return;

    const wanted = new Set(filesToUpload.map((f) => f.name));
    let pageToken: string | undefined = undefined;
    let conflict: any | null = null;

    while (true) {
      const list = await driveService.listFiles(token, folderId, 1000, undefined, !fromShared, pageToken);
      if (!list?.success) {
        setError(list?.message || 'Failed to check existing files');
        return;
      }

      const existingItems = (list?.data?.files || []) as any[];
      for (const it of existingItems) {
        if (!it?.name) continue;
        if (it?.mimeType === 'application/vnd.google-apps.folder') continue;
        if (wanted.has(String(it.name))) {
          conflict = it;
          break;
        }
      }

      if (conflict) break;
      const next = (list?.data?.nextPageToken || null) as string | null;
      if (!next) break;
      pageToken = String(next);
    }

    if (conflict) {
      setExistingFileId(String(conflict?.id || ''));
      setExistingFileName(String(conflict?.name || filesToUpload[0]?.name || ''));
      setRenameAndUploadFileValue(suggestRename(String(conflict?.name || filesToUpload[0]?.name || 'file')));
      setPendingUploadFiles(filesToUpload);
      setFileExistsOpen(true);
      return;
    }

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
                className={`rounded-xl border bg-white p-3 ${isDragOver ? 'border-blue-400 ring-2 ring-blue-100' : 'border-gray-200'
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
                  (async () => {
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
                    uploadToThisFolder(files);
                  })().catch((err: any) => {
                    setError(err?.message || 'Failed to read dropped folder');
                  });
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

                    {itemsNextPageToken ? (
                      <div className="px-4 py-3 border-t border-gray-100 bg-white">
                        <button
                          type="button"
                          disabled={Boolean(isLoadingMore)}
                          onClick={() => loadMoreItems()}
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                        >
                          {isLoadingMore ? 'Loading…' : 'Load more'}
                        </button>
                      </div>
                    ) : null}
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

            <PopupCard
              open={fileExistsOpen}
              title="File already exists"
              onClose={() => {
                setFileExistsOpen(false);
                setExistingFileId('');
                setExistingFileName('');
                setRenameAndUploadFileValue('');
                setPendingUploadFiles([]);
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
                    }}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!folderId) return;
                      const existingId = existingFileId;
                      const queue = pendingUploadFiles;
                      if (!existingId || !queue.length) return;
                      const current = queue[0];
                      const rest = queue.slice(1);

                      setFileExistsOpen(false);
                      setPendingUploadFiles([]);

                      try {
                        setIsUploading(true);
                        setError('');

                        const upRes = await driveService.overwriteFile(token, existingId, current);
                        if (!upRes?.success) throw new Error(upRes?.message || 'Failed to overwrite file');

                        await loadItems();
                      } catch (e: any) {
                        setError(e?.message || 'Upload failed');
                        return;
                      } finally {
                        setIsUploading(false);
                        setExistingFileId('');
                        setExistingFileName('');
                        setRenameAndUploadFileValue('');
                      }

                      if (rest.length) {
                        await uploadToThisFolder(rest);
                      }
                    }}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Replace
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!folderId) return;
                      const queue = pendingUploadFiles;
                      const nextName = renameAndUploadFileValue.trim();
                      if (!queue.length || !nextName) return;
                      const current = createFileWithName(queue[0], nextName);
                      const rest = queue.slice(1);

                      setFileExistsOpen(false);
                      setPendingUploadFiles([]);

                      try {
                        setIsUploading(true);
                        setError('');

                        const upRes = await driveService.uploadFile(token, current, folderId);
                        if (!upRes?.success) throw new Error(upRes?.message || 'Failed to upload file');

                        await loadItems();
                      } catch (e: any) {
                        setError(e?.message || 'Upload failed');
                        return;
                      } finally {
                        setIsUploading(false);
                        setExistingFileId('');
                        setExistingFileName('');
                        setRenameAndUploadFileValue('');
                      }

                      if (rest.length) {
                        await uploadToThisFolder(rest);
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
                    onClick={() => {
                      const files = dropLooseFiles.map((d) => d.file);
                      setDropChoiceOpen(false);
                      setDropFolderFiles([]);
                      setDropLooseFiles([]);
                      if (!files.length) return;
                      uploadToThisFolder(files);
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
                        uploadToThisFolder(looseFiles);
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
              <div className="text-sm text-gray-700">
                Your drop contains a folder and also individual files.
              </div>
              <div className="mt-3 text-xs text-gray-600">
                Folder files: {dropFolderFiles.length}
              </div>
              <div className="mt-1 text-xs text-gray-600">
                Individual files: {dropLooseFiles.length}
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

                        const rootId = String(existingId);

                        const uploadsByParent = new Map<string, File[]>();

                        for (const item of dropped) {
                          const rel = String(item.relativePath || item.file.name);
                          const parts = rel.split('/').filter(Boolean);
                          const withoutRoot = parts.slice(1);
                          const folderParts = withoutRoot.slice(0, Math.max(0, withoutRoot.length - 1));
                          const targetParent = folderParts.length
                            ? await ensureFolderPath(folderParts, rootId)
                            : rootId;

                          const key = targetParent || '';
                          const existing = uploadsByParent.get(key) || [];
                          existing.push(item.file);
                          uploadsByParent.set(key, existing);
                        }

                        for (const [parentKey, filesToUpload] of uploadsByParent.entries()) {
                          await uploadFilesWithOverwriteByName(filesToUpload, parentKey || undefined);
                        }

                        const looseFiles = looseItems.map((d) => d.file);
                        if (looseFiles.length) {
                          await uploadFilesWithOverwriteByName(looseFiles, folderId);
                        }

                        await loadItems();
                      } catch (e: any) {
                        setError(e?.message || 'Upload failed');
                      } finally {
                        setIsUploading(false);
                        setDropExistingFolderId('');
                        setDropExistingFolderName('');
                        setDropRenameAndUploadValue('');
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
                      const looseItems = pendingDropLooseItems;
                      if (!nextName || !dropped.length || !folderId) return;
                      setDropFolderExistsOpen(false);
                      setPendingDropFolderItems([]);
                      setPendingDropLooseItems([]);

                      try {
                        setIsUploading(true);
                        setError('');

                        const created = await driveService.createFolder(token, nextName, folderId);
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
                          const targetParent = folderParts.length
                            ? await ensureFolderPath(folderParts, rootId)
                            : rootId;

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
                          const res = await driveService.uploadFile(token, looseFiles, folderId);
                          if (!res?.success) throw new Error(res?.message || 'Failed to upload');
                        }

                        await loadItems();
                      } catch (e: any) {
                        setError(e?.message || 'Upload failed');
                      } finally {
                        setIsUploading(false);
                        setDropExistingFolderId('');
                        setDropExistingFolderName('');
                        setDropRenameAndUploadValue('');
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default FolderDetail;
