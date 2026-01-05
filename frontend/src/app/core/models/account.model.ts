export interface Account {
  id: number;
  name: string;
  type: string;
  currency: string;
  openingBalance: number;
  currentBalance: number;
  budgetLimit: number | null;
  remainingBudget: number | null;
  totalIncome: number;
  totalExpense: number;
  createdAt: string;
  updatedAt: string;
}
