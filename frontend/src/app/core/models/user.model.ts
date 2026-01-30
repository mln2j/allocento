export interface User {
  id: number;
  name: string;
  email: string;
  household_id?: number | null;
  organization_id?: number | null;
}
