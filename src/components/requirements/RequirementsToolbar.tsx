"use client";

import { RequirementType } from '@/types';
import Toolbar from '@/components/ui/Toolbar';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';

interface RequirementsToolbarProps {
  filterType: string;
  setFilterType: (value: string) => void;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  onClear: () => void;
}

const typeOptions = [
  { value: '', label: 'All Types' },
  { value: RequirementType.Functional, label: 'Functional' },
  { value: RequirementType.NonFunctional, label: 'Non-Functional' },
];

export default function RequirementsToolbar({
  filterType,
  setFilterType,
  searchQuery,
  setSearchQuery,
  onClear,
}: RequirementsToolbarProps) {
  return (
    <Toolbar>
      <div className="flex-shrink-0 w-40">
        <Select
          id="requirement-type"
          label="Requirement Type"
          options={typeOptions}
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        />
      </div>

      <div className="flex-1 min-w-[200px]">
        <Input
          id="keyword-search"
          label="Keyword Search"
          placeholder="Search by title or description..."
          showSearchIcon
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <Button variant="ghost" onClick={onClear}>
        Clear
      </Button>
    </Toolbar>
  );
}
