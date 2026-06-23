export type TransactionType = 'income' | 'expense' | 'transfer';

export interface Transaction {
  id: number;
  accountId: number;
  type: TransactionType;
  amount: number;
  date: string;
  description?: string | null;
  categoryId?: number | null;
  projectId?: number | null;
  targetAccountId?: number | null;
  target_account_id?: number | null;
  excludeFromAnalytics?: boolean | null;
  exclude_from_analytics?: boolean | null;

  user?: {
    id: number;
    name: string;
    email?: string;
  } | null;

  createdBy?: {
    id: number;
    name: string;
    email?: string;
  } | null;

  created_by?: {
    id: number;
    name: string;
    email?: string;
  } | null;

  account?: {
    id: number;
    name: string;
  };

  category?: {
    id: number;
    name: string;
    color?: string;
  };

  project?: {
    id: number;
    name: string;
    color?: string;
  };
}
