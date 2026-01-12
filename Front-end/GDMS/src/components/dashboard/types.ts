export type SuggestedCard = {
  title: string;
  badge: string;
};

export type QuickAccessItem = {
  title: string;
  accent: string;
};

export type FileType = 'doc' | 'sheet';

export type FileRow = {
  name: string;
  type: FileType;
  location: string;
  owner: string;
  modified: string;
  selected?: boolean;
};
