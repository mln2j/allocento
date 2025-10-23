import { AccountUser } from './account-user';

export interface Account {
  id: string;
  name: string;
  balance: number;
  currency: string;
  users: AccountUser[];
}
