export type AccountType = 'cash' | 'bank';

export interface Account {
  id: number;
  name: string;
  type: AccountType;
  currency: string;
  balance: number;
  opening_balance?: number;
  is_primary?: boolean;
  is_archived?: boolean;
  can_manage?: boolean;
  workspaces?: number[];
  workspace_id?: number;
  owning_workspace?: any;
  created_by?: {
    id: number;
    name: string;
    email: string;
  };
}
