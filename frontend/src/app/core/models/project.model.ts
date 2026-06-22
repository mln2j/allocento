export interface Project {
  id: number;
  workspace_id: number;
  name: string;
  description?: string;
  total_income?: number;
  total_expense?: number;
  total?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ProjectDetailsResponse {
  project: Project;
  total_income: number;
  total_expense: number;
}
