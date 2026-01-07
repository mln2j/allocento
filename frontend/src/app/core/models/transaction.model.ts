export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: number;
  accountId: number;
  type: TransactionType;
  amount: number;
  date: string;
  description?: string | null;
  categoryId?: number | null;
  projectId?: number | null;

  user?: {
    id: number;
    name: string;
    email?: string;
  } | null;
}
