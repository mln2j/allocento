export interface Transaction {
  id: string;
  accountId: string;
  amount: number;
  date: string;                                 // ISO format npr. "2025-10-23T12:00:00Z"
  categoryId: string;
  description?: string;
  status: 'pending' | 'completed' | 'failed';
  recurring?: boolean;                          // povremena transakcija (opcionalno)
  recurringInterval?: string;                   // 'monthly', 'weekly'...
}
