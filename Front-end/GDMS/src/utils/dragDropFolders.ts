export type DroppedFile = {
  file: File;
  relativePath: string;
};

const isLikelyFolderPlaceholder = (file: File) => {
  const name = String((file as any)?.name || '');
  const hasRelative = Boolean((file as any)?.webkitRelativePath);
  if (hasRelative) return false;
  if (file.size !== 0) return false;
  if (file.type) return false;
  if (!name) return false;
  return !name.includes('.');
};

const readAllDirectoryEntries = async (directoryReader: any): Promise<any[]> => {
  const entries: any[] = [];

  while (true) {
    const batch: any[] = await new Promise((resolve, reject) => {
      directoryReader.readEntries(resolve, reject);
    });

    if (!batch.length) break;
    entries.push(...batch);
  }

  return entries;
};

const traverseEntry = async (entry: any, prefix: string): Promise<DroppedFile[]> => {
  if (!entry) return [];

  if (entry.isFile) {
    const file: File = await new Promise((resolve, reject) => {
      entry.file(resolve, reject);
    });
    if (isLikelyFolderPlaceholder(file)) return [];
    return [{ file, relativePath: `${prefix}${file.name}` }];
  }

  if (entry.isDirectory) {
    const reader = entry.createReader();
    const entries = await readAllDirectoryEntries(reader);
    const nextPrefix = `${prefix}${entry.name}/`;

    const all: DroppedFile[] = [];
    for (const child of entries) {
      all.push(...(await traverseEntry(child, nextPrefix)));
    }
    return all;
  }

  return [];
};

const traverseHandle = async (handle: any, prefix: string): Promise<DroppedFile[]> => {
  if (!handle) return [];

  if (handle.kind === 'file') {
    const file: File = await handle.getFile();
    if (isLikelyFolderPlaceholder(file)) return [];
    return [{ file, relativePath: `${prefix}${file.name}` }];
  }

  if (handle.kind === 'directory') {
    const nextPrefix = `${prefix}${handle.name}/`;
    const all: DroppedFile[] = [];

    if (typeof handle.entries === 'function') {
      for await (const [, child] of handle.entries()) {
        all.push(...(await traverseHandle(child, nextPrefix)));
      }
      return all;
    }

    if (typeof handle.values === 'function') {
      for await (const child of handle.values()) {
        all.push(...(await traverseHandle(child, nextPrefix)));
      }
      return all;
    }

    return all;
  }

  return [];
};

export const getDroppedFiles = async (dataTransfer: DataTransfer): Promise<DroppedFile[]> => {
  const items = Array.from(dataTransfer?.items || []);

  const supportsHandles = items.some((it: any) => typeof it?.getAsFileSystemHandle === 'function');
  if (supportsHandles) {
    const all: DroppedFile[] = [];

    for (const item of items as any[]) {
      if (item.kind !== 'file') continue;
      const handle = await item.getAsFileSystemHandle?.();
      if (handle) {
        all.push(...(await traverseHandle(handle, '')));
        continue;
      }

      const file = item.getAsFile?.();
      if (file) {
        if (!isLikelyFolderPlaceholder(file)) {
          const rel = (file as any)?.webkitRelativePath || file.name;
          all.push({ file, relativePath: rel });
        }
      }
    }

    return all;
  }

  const supportsEntries = items.some((it: any) => typeof it?.webkitGetAsEntry === 'function');
  if (supportsEntries) {
    const all: DroppedFile[] = [];

    for (const item of items as any[]) {
      if (item.kind !== 'file') continue;
      const entry = item.webkitGetAsEntry?.();
      if (entry) {
        all.push(...(await traverseEntry(entry, '')));
        continue;
      }

      const file = item.getAsFile?.();
      if (file) {
        if (!isLikelyFolderPlaceholder(file)) {
          const rel = (file as any)?.webkitRelativePath || file.name;
          all.push({ file, relativePath: rel });
        }
      }
    }

    return all;
  }

  return Array.from(dataTransfer?.files || [])
    .filter((file) => !isLikelyFolderPlaceholder(file))
    .map((file: any) => ({ file, relativePath: file?.webkitRelativePath || file.name }));
};
