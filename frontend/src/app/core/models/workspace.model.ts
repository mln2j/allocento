export interface Workspace {
  id: number;
  workspace_id: string;
  name: string;
  type: 'personal' | 'household' | 'company';
  icon: string;
  currency: string;
  users_count?: number;
  pivot?: { role: string };
  users?: any[];
  accounts?: any[];
  enabled_features?: string[];
}
