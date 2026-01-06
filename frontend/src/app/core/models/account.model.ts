export type AccountType = 'personal' | 'household' | 'organization';

export interface Account {
  id: number;
  name: string;
  type: AccountType;
  currency: string;
  balance: number;
}
