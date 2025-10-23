export interface AccountPermission {
  canViewBalance: boolean;
  canViewTransactions: boolean;
  canAddTransaction: boolean;
  canDeleteTransaction: boolean;
  canManageUsers: boolean;
}
