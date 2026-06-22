export interface Category {
  id: number;
  name: string;
  type: string;
  parent_id?: number | null;
  workspace_id?: number | null;
}

export interface CategoryDetailsResponse {
  category: Category;
  total_income: number;
  total_expense: number;
}
