export type AccountType = 'checking' | 'savings' | 'cash' | 'credit' | 'investment' | 'other';

export interface Account {
  id: number;
  name: string;
  type: AccountType;
  currency: string;
  balance: number;
  is_primary?: boolean;
}
