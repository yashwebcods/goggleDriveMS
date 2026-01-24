import type { FileRow } from './types';
import { useRef, useState, type ChangeEvent } from 'react';

type ViewMode = 'list' | 'box';

type MainSectionProps = {
  quickAccess: FileRow[];
  items: FileRow[];
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onOpenItem?: (item: FileRow) => void;
  onItemDelete?: (fileId: string, currentName: string) => void;
  onFolderDownload?: (folderId: string) => void;
  onFolderUploadFiles?: (folderId: string, files: File[]) => void;
  onFolderRename?: (folderId: string, currentName: string) => void;
  onFolderShare?: (folderId: string) => void;
  onFolderDelete?: (folderId: string, currentName: string) => void;
  title?: string;
  onBackToRoot?: () => void | Promise<void>;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void | Promise<void>;
};

const MainSection = ({
  quickAccess,
  items,
  viewMode,
  onViewModeChange,
  onOpenItem,
  onItemDelete,
  onFolderDownload,
  onFolderUploadFiles,
  onFolderRename,
  onFolderShare,
  onFolderDelete,
  title,
  onBackToRoot,
  hasMore,
  isLoadingMore,
  onLoadMore,
}: MainSectionProps) => {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [pendingUploadFolderId, setPendingUploadFolderId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isFolder = (item: FileRow) => item?.mimeType === 'application/vnd.google-apps.folder';

  const toggleMenu = (id?: string) => {
    if (!id) return;
    setOpenMenuId((curr) => (curr === id ? null : id));
  };

  const closeMenu = () => setOpenMenuId(null);

  const initialsFromOwner = (owner?: string) => {
    const raw = String(owner || '').trim();
    if (!raw || raw === '—') return '—';
    const atIdx = raw.indexOf('@');
    const base = (atIdx > 0 ? raw.slice(0, atIdx) : raw).trim();
    if (!base) return '—';
    const parts = base.split(/[\s._-]+/).filter(Boolean);
    const first = parts[0]?.[0] || base[0];
    const second = parts[1]?.[0] || base[1] || '';
    return (first + second).toUpperCase();
  };

  const triggerUploadToFolder = (folderId: string) => {
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
    onFolderUploadFiles?.(folderId, files);
  };

  const runFolderAction = (action: 'rename' | 'share' | 'delete', item: FileRow) => {
    if (!item?.id) return;
    if (!isFolder(item)) return;
    closeMenu();
    if (action === 'rename') onFolderRename?.(item.id, item.name);
    if (action === 'share') onFolderShare?.(item.id);
    if (action === 'delete') onFolderDelete?.(item.id, item.name);
  };

  const runFolderDownload = (item: FileRow) => {
    if (!item?.id) return;
    if (!isFolder(item)) return;
    closeMenu();
    onFolderDownload?.(item.id);
  };

  const runItemDelete = (item: FileRow) => {
    if (!item?.id) return;
    closeMenu();
    onItemDelete?.(item.id, item.name);
  };

  return (
    <main className="flex-1 min-w-0 overflow-y-auto">
      <input ref={fileInputRef} type="file" multiple onChange={onFilePicked} className="hidden" />
      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {onBackToRoot ? (
              <button
                type="button"
                onClick={onBackToRoot}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Back
              </button>
            ) : null}
            <div className="text-lg font-medium text-gray-800">{title || 'My Drive'}</div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M7 10L12 15L17 10"
                stroke="#6B7280"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="flex items-center gap-2 text-gray-500">
            <button
              type="button"
              onClick={() => onViewModeChange('list')}
              className={`h-9 w-9 rounded-full flex items-center justify-center hover:bg-white/70 ${
                viewMode === 'list' ? 'bg-white shadow-sm' : ''
              }`}
              aria-label="List view"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 7H20" stroke="#6B7280" strokeWidth="1.7" strokeLinecap="round" />
                <path d="M4 12H20" stroke="#6B7280" strokeWidth="1.7" strokeLinecap="round" />
                <path d="M4 17H20" stroke="#6B7280" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('box')}
              className={`h-9 w-9 rounded-full flex items-center justify-center hover:bg-white/70 ${
                viewMode === 'box' ? 'bg-white shadow-sm' : ''
              }`}
              aria-label="Box view"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 4H10V10H4V4Z" stroke="#6B7280" strokeWidth="1.7" />
                <path d="M14 4H20V10H14V4Z" stroke="#6B7280" strokeWidth="1.7" />
                <path d="M4 14H10V20H4V14Z" stroke="#6B7280" strokeWidth="1.7" />
                <path d="M14 14H20V20H14V14Z" stroke="#6B7280" strokeWidth="1.7" />
              </svg>
            </button>
          </div>
        </div>

        <div className="mt-6">
          <div className="text-xs font-semibold text-gray-500">Quick access</div>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickAccess.map((qa, idx) => (
              <div
                key={qa.id || `${qa.name}-${idx}`}
                onClick={() => onOpenItem?.(qa)}
                className="text-left rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden cursor-pointer relative"
                role="button"
                tabIndex={0}
              >
                <div className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`h-3 w-3 rounded-sm ${
                          idx % 4 === 0
                            ? 'bg-yellow-500'
                            : idx % 4 === 1
                              ? 'bg-blue-500'
                              : idx % 4 === 2
                                ? 'bg-green-500'
                                : 'bg-orange-300'
                        }`}
                      />
                      <div className="text-[11px] font-medium text-gray-700 leading-4 truncate" title={qa.name}>
                        {qa.name}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isFolder(qa) && qa.id ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleMenu(qa.id);
                          }}
                          className="h-7 w-7 rounded-full hover:bg-gray-100 flex items-center justify-center"
                          aria-label="Folder actions"
                        >
                          ...
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div className="h-28 bg-gray-50 border-t border-gray-100 flex items-center justify-center px-3">
                  {isFolder(qa) && qa.id ? (
                    <div className="w-full flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          closeMenu();
                          triggerUploadToFolder(qa.id as string);
                        }}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Add file
                      </button>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            runFolderAction('rename', qa);
                          }}
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                        >
                          Rename
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            runFolderAction('share', qa);
                          }}
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                        >
                          Share
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="h-20 w-28 rounded bg-white border border-gray-200 shadow-sm" />
                  )}
                </div>

                {openMenuId && qa.id && openMenuId === qa.id ? (
                  <div className="absolute right-2 top-10 z-20 w-40 rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        runFolderDownload(qa);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Download
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        runFolderAction('delete', qa);
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
        </div>

        <div className="mt-10">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-gray-500">Files</div>
            <div className="text-xs text-gray-400">Last opened by you</div>
          </div>

          {viewMode === 'list' ? (
            <div className="mt-3 bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
              <div className="grid grid-cols-12 px-4 py-3 text-[11px] text-gray-500">
                <div className="col-span-6">Name</div>
                <div className="col-span-2">Location</div>
                <div className="col-span-2">Owner</div>
                <div className="col-span-2">Last modified</div>
              </div>
              <div className="h-px bg-gray-100" />
              {items.map((f, idx) => (
                <div
                  key={f.id || `${f.name}-${idx}`}
                  className={`grid grid-cols-12 px-4 py-3 text-sm items-center border-t border-gray-50 cursor-pointer ${
                    f.selected ? 'bg-[#E8F0FE]' : 'bg-white'
                  }`}
                  onClick={() => onOpenItem?.(f)}
                >
                  <div className="col-span-6 flex items-center justify-between gap-3 min-w-0">
                    <div className={`truncate ${f.selected ? 'text-blue-700 font-medium' : 'text-gray-800'}`}>{f.name}</div>
                    {isFolder(f) && f.id ? (
                      <div className="relative shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleMenu(f.id);
                          }}
                          className="h-7 w-7 rounded-full hover:bg-gray-100 flex items-center justify-center"
                          aria-label="Folder actions"
                        >
                          ...
                        </button>
                        {openMenuId && openMenuId === f.id ? (
                          <div className="absolute right-0 top-full mt-2 z-20 w-40 rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                runFolderDownload(f);
                              }}
                              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                            >
                              Download
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                runFolderAction('delete', f);
                              }}
                              className="w-full px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50"
                            >
                              Delete
                            </button>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          runItemDelete(f);
                        }}
                        className="h-7 w-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-red-600"
                        aria-label="Delete file"
                        title="Delete"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M6 7H18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                          <path d="M10 11V17" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                          <path d="M14 11V17" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                          <path
                            d="M9 7V5.5C9 4.67 9.67 4 10.5 4H13.5C14.33 4 15 4.67 15 5.5V7"
                            stroke="currentColor"
                            strokeWidth="1.7"
                            strokeLinecap="round"
                          />
                          <path
                            d="M7 7L7.8 20.2C7.86 21.19 8.68 22 9.67 22H14.33C15.32 22 16.14 21.19 16.2 20.2L17 7"
                            stroke="currentColor"
                            strokeWidth="1.7"
                            strokeLinecap="round"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                  <div className="col-span-2 text-xs text-gray-600">{f.location}</div>
                  <div className="col-span-2 flex items-center gap-2 text-xs text-gray-600 min-w-0">
                    <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-semibold text-gray-700">
                      {initialsFromOwner(f.owner)}
                    </div>
                    <div className="truncate" title={f.owner}>
                      {f.owner}
                    </div>
                  </div>
                  <div className="col-span-2 text-xs text-gray-600">{f.modified}</div>
                </div>
              ))}

              {hasMore && onLoadMore ? (
                <div className="px-4 py-3 border-t border-gray-100 bg-white">
                  <button
                    type="button"
                    disabled={Boolean(isLoadingMore)}
                    onClick={() => onLoadMore()}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                  >
                    {isLoadingMore ? 'Loading…' : 'Load more'}
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <div>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {items.map((card, idx) => (
                  <div
                    key={card.id || `${card.name}-${idx}`}
                    onClick={() => onOpenItem?.(card)}
                    className="text-left rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden cursor-pointer relative"
                    role="button"
                    tabIndex={0}
                  >
                  <div className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`h-3 w-3 rounded-sm ${idx % 4 === 0 ? 'bg-yellow-500' : idx % 4 === 1 ? 'bg-blue-500' : idx % 4 === 2 ? 'bg-green-500' : 'bg-orange-300'}`} />
                        <div className="text-[11px] font-medium text-gray-700 whitespace-pre-line leading-4 truncate">
                          {card.name}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {isFolder(card) && card.id ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleMenu(card.id);
                            }}
                            className="h-7 w-7 rounded-full hover:bg-gray-100 flex items-center justify-center"
                            aria-label="Folder actions"
                          >
                            ...
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              runItemDelete(card);
                            }}
                            className="h-7 w-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-red-600"
                            aria-label="Delete file"
                            title="Delete"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M6 7H18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                              <path d="M10 11V17" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                              <path d="M14 11V17" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                              <path
                                d="M9 7V5.5C9 4.67 9.67 4 10.5 4H13.5C14.33 4 15 4.67 15 5.5V7"
                                stroke="currentColor"
                                strokeWidth="1.7"
                                strokeLinecap="round"
                              />
                              <path
                                d="M7 7L7.8 20.2C7.86 21.19 8.68 22 9.67 22H14.33C15.32 22 16.14 21.19 16.2 20.2L17 7"
                                stroke="currentColor"
                                strokeWidth="1.7"
                                strokeLinecap="round"
                              />
                            </svg>
                          </button>
                        )}
                        <div className="h-7 w-7 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-semibold text-gray-700">
                          {initialsFromOwner(card.owner)}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="h-28 bg-gray-50 border-t border-gray-100 flex items-center justify-center">
                    <div className="h-20 w-28 rounded bg-white border border-gray-200 shadow-sm" />
                  </div>

                  {openMenuId && card.id && openMenuId === card.id ? (
                    <div className="absolute right-2 top-10 z-20 w-40 rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          runFolderDownload(card);
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                      >
                        Download
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          runFolderAction('delete', card);
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

              {hasMore && onLoadMore ? (
                <div className="mt-4">
                  <button
                    type="button"
                    disabled={Boolean(isLoadingMore)}
                    onClick={() => onLoadMore()}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                  >
                    {isLoadingMore ? 'Loading…' : 'Load more'}
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </main>
  );
};

export default MainSection;
