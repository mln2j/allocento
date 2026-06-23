export interface Workspace {
  id: number;
  name: string;
  type: 'personal' | 'household' | 'company';
  currency: string;
  users_count?: number;
  pivot?: { role: string };
  users?: any[];
  accounts?: any[];
  enabled_features?: string[];
}
