'use client';

import { useState, useEffect, useCallback } from 'react';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import AdminUsersToolbar from '@/components/admin/AdminUsersToolbar';
import AdminUsersTable from '@/components/admin/AdminUsersTable';
import { fetchAllUsers, approveUsers, revokeApproval, promoteToAdmin, demoteToUser, AdminUser } from '@/app/admin/actions';


const ITEMS_PER_PAGE = 10;
const TOAST_DURATION_MS = 5000;

export default function AdminUsersClient() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [toastProgress, setToastProgress] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isActioning, setIsActioning] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const result = await fetchAllUsers();
    if (result.error) {
      setError(result.error);
    } else {
      setUsers(result.data || []);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Toast auto-dismiss with progress bar
  useEffect(() => {
    if (!successMessage) {
      setToastProgress(100);
      return;
    }

    const startTime = Date.now();
    const intervalId = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 1 - elapsed / TOAST_DURATION_MS);
      setToastProgress(Math.round(remaining * 100));
    }, 50);

    const timeoutId = setTimeout(() => {
      setSuccessMessage(null);
    }, TOAST_DURATION_MS);

    return () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
    };
  }, [successMessage]);

  const handleDismissSuccess = () => {
    setSuccessMessage(null);
  };

  const totalPages = Math.max(1, Math.ceil(users.length / ITEMS_PER_PAGE));
  const paginatedUsers = users.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectableUsers = paginatedUsers.filter(u => u.id !== currentUser?.id);

  const handleToggleSelectAll = () => {
    if (selectableUsers.every(u => selectedIds.has(u.id))) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        selectableUsers.forEach(u => next.delete(u.id));
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        selectableUsers.forEach(u => next.add(u.id));
        return next;
      });
    }
  };

  const updateUsersApproval = (userIds: string[], isApproved: boolean) => {
    setUsers(prev =>
      prev.map(u => userIds.includes(u.id) ? { ...u, is_approved: isApproved } : u)
    );
  };

  const handleApprove = async (userId: string) => {
    setIsActioning(userId);
    const result = await approveUsers([userId]);
    if (result.error) {
      setError(result.error);
    } else {
      updateUsersApproval([userId], true);
      setSuccessMessage('User approved successfully.');
    }
    setIsActioning(null);
  };

  const handleRevoke = async (userId: string) => {
    setIsActioning(userId);
    const result = await revokeApproval([userId]);
    if (result.error) {
      setError(result.error);
    } else {
      updateUsersApproval([userId], false);
      setSuccessMessage('User approval revoked.');
    }
    setIsActioning(null);
  };

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return;
    setError(null);
    const ids = Array.from(selectedIds);
    const result = await approveUsers(ids);
    if (result.error) {
      setError(result.error);
    } else {
      updateUsersApproval(ids, true);
      setSuccessMessage(`${ids.length} user(s) approved successfully.`);
      setSelectedIds(new Set());
    }
  };

  const handleBulkRevoke = async () => {
    if (selectedIds.size === 0) return;
    setError(null);
    const ids = Array.from(selectedIds);
    const result = await revokeApproval(ids);
    if (result.error) {
      setError(result.error);
    } else {
      updateUsersApproval(ids, false);
      setSuccessMessage(`${ids.length} user(s) approval revoked.`);
      setSelectedIds(new Set());
    }
  };

  const handleToggleAdmin = async (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    setIsActioning(userId);
    if (user.role === 'admin') {
      const result = await demoteToUser([userId]);
      if (result.error) {
        setError(result.error);
      } else {
        setUsers(prev =>
          prev.map(u => u.id === userId ? { ...u, role: 'user' } : u)
        );
        setSuccessMessage('User demoted to user role.');
      }
    } else {
      const result = await promoteToAdmin([userId]);
      if (result.error) {
        setError(result.error);
      } else {
        setUsers(prev =>
          prev.map(u => u.id === userId ? { ...u, role: 'admin', is_approved: true } : u)
        );
        setSuccessMessage('User promoted to admin.');
      }
    }
    setIsActioning(null);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Users Management</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Manage user accounts and approval status.
        </p>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Toast Notification */}
      {successMessage && (
        <div className="fixed top-24 right-6 z-50 w-80 rounded-xl bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 p-4 text-sm text-gray-800 dark:text-gray-100">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="font-semibold text-green-600 dark:text-green-400">Success</div>
              <p className="mt-1 text-gray-600 dark:text-gray-300">{successMessage}</p>
            </div>
            <button
              onClick={handleDismissSuccess}
              className="text-xs font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
            >
              Close
            </button>
          </div>
          <div className="mt-3 h-1 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
            <div
              className="h-full bg-green-500 dark:bg-green-400 transition-[width] duration-100 ease-linear"
              style={{ width: `${toastProgress}%` }}
              aria-hidden="true"
            />
          </div>
        </div>
      )}

      {/* Toolbar */}
      <AdminUsersToolbar
        selectedCount={selectedIds.size}
        onApprove={handleBulkApprove}
        onRevoke={handleBulkRevoke}
      />

      {/* Users Table */}
      <AdminUsersTable
        users={paginatedUsers}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        selectedIds={selectedIds}
        onToggleSelect={handleToggleSelect}
        onToggleSelectAll={handleToggleSelectAll}
        onApprove={handleApprove}
        onRevoke={handleRevoke}
        onToggleAdmin={handleToggleAdmin}
        currentUserId={currentUser?.id}
        isLoading={isLoading}
        isActioning={isActioning}
      />
    </div>
  );
}
