export interface Category {
  id: number;
  name: string;
  type: string;
  workspace_id?: number | null;
}

export interface CategoryDetailsResponse {
  category: Category;
  total_income: number;
  total_expense: number;
}
