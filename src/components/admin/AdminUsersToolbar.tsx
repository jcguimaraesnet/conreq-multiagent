'use client';

import { CheckCircle, XCircle } from 'lucide-react';
import Toolbar from '@/components/ui/Toolbar';
import Button from '@/components/ui/Button';

interface AdminUsersToolbarProps {
  selectedCount: number;
  onApprove: () => void;
  onRevoke: () => void;
}

export default function AdminUsersToolbar({
  selectedCount,
  onApprove,
  onRevoke,
}: AdminUsersToolbarProps) {
  const hasSelection = selectedCount > 0;

  return (
    <Toolbar>
      <span className="text-sm text-gray-500 dark:text-gray-400">
        {hasSelection ? `${selectedCount} selected` : 'No users selected'}
      </span>

      <div className="flex-grow"></div>

      <Button
        variant="outline"
        size="sm"
        onClick={onApprove}
        disabled={!hasSelection}
      >
        <CheckCircle className="w-4 h-4" />
        Approve
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={onRevoke}
        disabled={!hasSelection}
      >
        <XCircle className="w-4 h-4" />
        Revoke
      </Button>
    </Toolbar>
  );
}
