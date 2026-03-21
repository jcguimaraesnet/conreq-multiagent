// Frontend display types (used in UI)
export enum RequirementType {
  Functional = 'Functional',
  NonFunctional = 'Non-Functional',
  Conjectural = 'Conjectural'
}

// Backend API types (snake_case)
export enum BackendRequirementType {
  Functional = 'functional',
  NonFunctional = 'non_functional',
  Conjectural = 'conjectural'
}

export enum NFRCategory {
  Interoperability = 'interoperability',
  Reliability = 'reliability',
  Performance = 'performance',
  Availability = 'availability',
  Scalability = 'scalability',
  Maintainability = 'maintainability',
  Portability = 'portability',
  Security = 'security',
  Usability = 'usability',
  Regulatory = 'regulatory',
  Constraint = 'constraint'
}

// Requirement from backend API
export interface RequirementAPI {
  id: string;
  project_id: string;
  requirement_id: string;
  type: BackendRequirementType;
  description: string;
  category: NFRCategory | null;
  created_at: string;
  updated_at: string;
}

// Requirement formatted for frontend display
export interface Requirement {
  id: string;
  requirement_id: string;
  project_id: string;
  title: string;
  description: string;
  type: RequirementType;
  category: NFRCategory | null;
  author: string;
  created_at: string;
  updated_at: string;
}

// Helper function to map backend type to frontend type
export function mapBackendTypeToFrontend(backendType: BackendRequirementType): RequirementType {
  switch (backendType) {
    case BackendRequirementType.Functional:
      return RequirementType.Functional;
    case BackendRequirementType.NonFunctional:
      return RequirementType.NonFunctional;
    case BackendRequirementType.Conjectural:
      return RequirementType.Conjectural;
    default:
      return RequirementType.Functional;
  }
}

// Helper function to map frontend type to backend type
export function mapFrontendTypeToBackend(frontendType: RequirementType): BackendRequirementType {
  switch (frontendType) {
    case RequirementType.Functional:
      return BackendRequirementType.Functional;
    case RequirementType.NonFunctional:
      return BackendRequirementType.NonFunctional;
    case RequirementType.Conjectural:
      return BackendRequirementType.Conjectural;
    default:
      return BackendRequirementType.Functional;
  }
}

export interface Project {
  id: string;
  project_id: string | null;
  title: string;
  description: string | null;
  author_first_name?: string | null;
  author_last_name?: string | null;
  author?: string;
  user_id?: string;
  vision_document_name?: string | null;
  vision_extracted_text?: string | null;
  summary?: string | null;
  business_domain?: string | null;
  business_objective?: string | null;
  stakeholder?: string | null;
  requirements_document_name?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface RequirementCounts {
  functional: number;
  non_functional: number;
  conjectural: number;
}

export interface ProjectDetails extends Project {
  requirement_counts: RequirementCounts;
}

export interface User {
  name: string;
  role: string;
  avatarUrl: string;
}

// Conjectural Requirements (Kanban board)
export type ConjecturalStatus = 'todo' | 'inprogress' | 'done';

export interface ConjecturalEvaluation {
  id: string;
  requirement_id: string;
  type: 'llm' | 'human';
  unambiguous: number;
  completeness: number;
  atomicity: number;
  verifiable: number;
  conforming: number;
  overall_score: number;
  justifications: Record<string, string>;
  created_at: string;
}

export interface ConjecturalRequirement {
  id: string;
  project_id: string;
  requirement_id: string | null;
  attempt: number;
  ranking: number | null;
  status: ConjecturalStatus;
  desired_behavior: string;
  positive_impact: string;
  uncertainty: string;
  solution_assumption: string;
  uncertainty_evaluated: string;
  observation_analysis: string;
  evaluations: ConjecturalEvaluation[];
  history_snapshot: unknown[] | null;
  created_at: string;
  updated_at: string;
}
