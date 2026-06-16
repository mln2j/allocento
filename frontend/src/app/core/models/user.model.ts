export interface User {
  id: number;
  name: string;
  email: string;
  favorite_workspace_id?: number | null;
  profile_photo_url?: string;
  workspaces?: any[];
  nav_preferences?: string[] | null;
}
