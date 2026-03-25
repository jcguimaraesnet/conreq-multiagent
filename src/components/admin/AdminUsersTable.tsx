import { CheckCircle, XCircle, ChevronLeft, ChevronRight, UserCog, ShieldCheck } from 'lucide-react';
import Card from '@/components/ui/Card';
import { AdminUser } from '@/app/admin/actions';

interface AdminUsersTableProps {
  users: AdminUser[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onApprove: (userId: string) => void;
  onRevoke: (userId: string) => void;
  onToggleAdmin: (userId: string) => void;
  currentUserId?: string;
  isLoading?: boolean;
  isActioning?: string | null;
}

export default function AdminUsersTable({
  users,
  currentPage,
  totalPages,
  onPageChange,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onApprove,
  onRevoke,
  onToggleAdmin,
  currentUserId,
  isLoading = false,
  isActioning = null,
}: AdminUsersTableProps) {
  const selectableUsers = users.filter(u => u.id !== currentUserId);
  const allSelected = selectableUsers.length > 0 && selectableUsers.every(u => selectedIds.has(u.id));

  const getUserName = (user: AdminUser) => {
    const first = user.first_name?.trim();
    const last = user.last_name?.trim();
    if (first || last) {
      return [first, last].filter(Boolean).join(' ');
    }
    return 'Unknown';
  };

  const renderPageNumbers = () => {
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => onPageChange(i)}
          className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-medium transition-colors ${
            i === currentPage
              ? 'bg-black dark:bg-white text-white dark:text-black'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          {i}
        </button>
      );
    }
    return pages;
  };

  return (
    <Card noPadding className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-700 text-white dark:bg-gray-800/80">
              <th className="px-4 py-4 w-12">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onToggleSelectAll}
                  className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                />
              </th>
              <th className="px-4 py-4 text-xs font-semibold uppercase tracking-wider">Name</th>
              <th className="px-4 py-4 text-xs font-semibold uppercase tracking-wider">Email</th>
              <th className="px-4 py-4 text-xs font-semibold uppercase tracking-wider text-center">Role</th>
              <th className="px-4 py-4 text-xs font-semibold uppercase tracking-wider text-center">Status</th>
              <th className="px-4 py-4 text-xs font-semibold uppercase tracking-wider">Created At</th>
              <th className="px-4 py-4 text-xs font-semibold uppercase tracking-wider text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <span className="ml-3 text-gray-600 dark:text-gray-300">Loading users...</span>
                  </div>
                </td>
              </tr>
            ) : users.length > 0 ? (
              users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                  <td className="px-4 py-3 align-middle">
                    {user.id === currentUserId ? (
                      <span title="You"><UserCog className="w-4 h-4 text-gray-400 dark:text-gray-500" /></span>
                    ) : (
                      <input
                        type="checkbox"
                        checked={selectedIds.has(user.id)}
                        onChange={() => onToggleSelect(user.id)}
                        className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                      />
                    )}
                  </td>
                  <td className="px-4 py-3 align-middle">
                    <span className="text-sm text-gray-900 dark:text-white">{getUserName(user)}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 align-middle">
                    {user.email || '-'}
                  </td>
                  <td className="px-4 py-3 text-center align-middle">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.role === 'admin'
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center align-middle">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.is_approved
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                    }`}>
                      {user.is_approved ? 'Approved' : 'Pending'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 align-middle">
                    {user.created_at
                      ? new Date(user.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })
                      : '-'}
                  </td>
                  <td className="px-4 py-3 text-center align-middle">
                    {user.id === currentUserId ? (
                      <div className="flex items-center justify-center gap-1">
                        <button className="p-1.5 rounded-full text-gray-300 dark:text-gray-600 opacity-30 cursor-not-allowed" disabled title="Cannot modify your own account">
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 rounded-full text-gray-300 dark:text-gray-600 opacity-30 cursor-not-allowed" disabled title="Cannot modify your own account">
                          <XCircle className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 rounded-full text-gray-300 dark:text-gray-600 opacity-30 cursor-not-allowed" disabled title="Cannot modify your own account">
                          <ShieldCheck className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-1">
                        <button
                          className={`p-1.5 rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                            !user.is_approved
                              ? 'text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20'
                              : 'text-gray-300 dark:text-gray-600'
                          }`}
                          title="Approve User"
                          onClick={() => onApprove(user.id)}
                          disabled={user.is_approved || isActioning === user.id}
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button
                          className={`p-1.5 rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                            user.is_approved
                              ? 'text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20'
                              : 'text-gray-300 dark:text-gray-600'
                          }`}
                          title="Revoke Approval"
                          onClick={() => onRevoke(user.id)}
                          disabled={!user.is_approved || isActioning === user.id}
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                        <button
                          className={`p-1.5 rounded-full transition-colors disabled:cursor-not-allowed ${
                            user.role === 'admin'
                              ? 'text-purple-600 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-900/20'
                              : 'text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:text-purple-400 dark:hover:bg-purple-900/20'
                          }`}
                          title={user.role === 'admin' ? 'Demote to User' : 'Make Admin'}
                          onClick={() => onToggleAdmin(user.id)}
                          disabled={isActioning === user.id}
                        >
                          <ShieldCheck className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-center p-3 border-t border-border-light dark:border-border-dark bg-white dark:bg-surface-dark">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="flex items-center gap-1 px-3 py-2 mr-2 border border-border-light dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>
          {renderPageNumbers()}
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="flex items-center gap-1 px-3 py-2 ml-2 border border-border-light dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </Card>
  );
}
