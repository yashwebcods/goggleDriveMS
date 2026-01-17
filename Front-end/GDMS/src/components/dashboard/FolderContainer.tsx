import type { FileRow } from './types';
import { useRef, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';

type Props = {
  folders: FileRow[];
  onDownload?: (folderId: string) => void;
  onUploadToFolder?: (folderId: string, files: File[]) => void;
  onShare?: (folderId: string) => void;
  onRename?: (folderId: string, currentName: string) => void;
  onDelete?: (folderId: string, currentName: string) => void;
};

const FolderContainer = ({
  folders,
  onDownload,
  onUploadToFolder,
  onShare,
  onRename,
  onDelete,
}: Props) => {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [pendingUploadFolderId, setPendingUploadFolderId] = useState<string | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();

  const triggerUpload = (folderId: string) => {
    setPendingUploadFolderId(folderId);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const onFilePicked = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const folderId = pendingUploadFolderId;
    setPendingUploadFolderId(null);
    if (!files.length || !folderId) return;
    onUploadToFolder?.(folderId, files);
  };

  return (
    <div className="max-w-6xl mx-auto px-6">
      <div className="mb-4 rounded-xl border border-gray-200 bg-white p-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold text-gray-600">My Drive Folders</div>
          <div className="text-xs text-gray-400">{folders.length}</div>
        </div>

        <input ref={fileInputRef} type="file" multiple onChange={onFilePicked} className="hidden" />

        {folders.length ? (
          <div className="mt-3 py-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {folders.map((f, idx) => (
              <div
                key={f.id || `${f.name}-${idx}`}
                className={`flex items-center justify-between gap-3 rounded-lg border bg-white px-3 py-2 relative cursor-pointer ${
                  dragOverFolderId === f.id
                    ? 'border-blue-400 ring-2 ring-blue-100'
                    : 'border-gray-200'
                }`}
                onClick={() => {
                  if (!f.id) return;
                  navigate(`/folders/${f.id}`, { state: { folderName: f.name } });
                }}
                onDragOver={(e) => {
                  if (!f.id) return;
                  e.preventDefault();
                  setDragOverFolderId(f.id);
                }}
                onDragLeave={() => {
                  if (dragOverFolderId === f.id) setDragOverFolderId(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!f.id) return;
                  setDragOverFolderId(null);
                  const dropped = Array.from(e.dataTransfer?.files || []);
                  if (!dropped.length) return;
                  onUploadToFolder?.(f.id, dropped);
                }}
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-gray-800">{f.name}</div>
                  <div className="mt-0.5 text-xs text-gray-500">{f.modified || ' '}</div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!f.id) return;
                      onDownload?.(f.id);
                    }}
                    disabled={!f.id}
                    className="shrink-0 rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Download
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenuId(openMenuId === f.id ? null : (f.id || null));
                    }}
                    disabled={!f.id}
                    className="shrink-0 rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    aria-label="Folder actions"
                  >
                    ...
                  </button>
                </div>

                {openMenuId && openMenuId === f.id ? (
                  <div className="absolute right-2 top-10 z-10 w-40 rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!f.id) return;
                        setOpenMenuId(null);
                        triggerUpload(f.id);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Add file
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!f.id) return;
                        setOpenMenuId(null);
                        onShare?.(f.id);
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
                        onRename?.(f.id, f.name);
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
                        onDelete?.(f.id, f.name);
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
          <div className="mt-3 text-sm text-gray-600">No folders found.</div>
        )}
      </div>
    </div>
  );
};

export default FolderContainer;
