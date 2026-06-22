export interface Invitation {
  id: number;
  workspace_id: number;
  email: string;
  role: string;
  token: string;
  created_at?: string;
  updated_at?: string;
}
