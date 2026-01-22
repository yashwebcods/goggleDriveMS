export const getFriendlyRequestMessages = (method: string, path: string) => {
  const m = (method || 'GET').toString().toUpperCase();
  const p = (path || '').toString();

  // Drive
  if (m === 'PATCH' && p.startsWith('/api/drive/files/')) {
    return { success: 'Name changed successfully', error: 'Failed to change name' };
  }
  if (m === 'POST' && p === '/api/drive/folders') {
    return { success: 'Folder created successfully', error: 'Failed to create folder' };
  }
  if (m === 'POST' && p === '/api/drive/upload') {
    return { success: 'File uploaded successfully', error: 'Failed to upload file' };
  }
  if (m === 'POST' && p === '/api/drive/share') {
    return { success: 'Shared successfully', error: 'Failed to share' };
  }

  // Auth
  if (m === 'POST' && p === '/api/auth/login') {
    return { success: 'Login successful', error: 'Login failed' };
  }
  if (m === 'POST' && p === '/api/auth/register') {
    return { success: 'Account created successfully', error: 'Failed to create account' };
  }
  if (m === 'POST' && p === '/api/auth/members') {
    return { success: 'User created successfully', error: 'Failed to create user' };
  }
  if (m === 'PATCH' && /\/api\/auth\/clients\/[^/]+\/manager/.test(p)) {
    return { success: 'Client manager updated successfully', error: 'Failed to update client manager' };
  }
  if (m === 'PATCH' && /\/api\/auth\/admins\/[^/]+\/superadmin/.test(p)) {
    return { success: 'Admin updated successfully', error: 'Failed to update admin' };
  }
  if (m === 'PATCH' && /\/api\/auth\/managers\/[^/]+\/admin/.test(p)) {
    return { success: 'Manager updated successfully', error: 'Failed to update manager' };
  }

  // Users
  if (m === 'GET' && p.startsWith('/api/users')) {
    return { success: 'Users loaded', error: 'Failed to load users' };
  }

  // Generic fallback
  if (m === 'DELETE') return { success: 'Deleted successfully', error: 'Failed to delete' };
  if (m === 'POST') return { success: 'Saved successfully', error: 'Failed to save' };
  if (m === 'PATCH' || m === 'PUT') return { success: 'Updated successfully', error: 'Failed to update' };

  return { success: 'Request completed successfully', error: 'Request failed' };
};
