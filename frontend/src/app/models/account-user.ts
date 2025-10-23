import { AccountPermission } from './account-permission';

export interface AccountUser {
  userId: string;
  role: 'owner' | 'custom';
  permissions: AccountPermission;
}
