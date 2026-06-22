<?php

namespace App\Services;

use App\Repositories\Contracts\CategoryRepositoryInterface;
use App\Models\Transaction;
use App\Models\Category;
use Illuminate\Support\Facades\DB;

class CategoryService
{
    protected $categoryRepository;

    public function __construct(CategoryRepositoryInterface $categoryRepository)
    {
        $this->categoryRepository = $categoryRepository;
    }

    public function getAllForWorkspace(int $workspaceId)
    {
        return $this->categoryRepository->getAllForWorkspace($workspaceId);
    }

    public function createCategory(array $data)
    {
        return $this->categoryRepository->create($data);
    }

    public function getCategoryWithTotals(int $id, int $workspaceId)
    {
        $category = Category::with(['transactions.project', 'transactions.account'])->where(function($q) use ($workspaceId) {
            $q->where('workspace_id', $workspaceId)
              ->orWhereNull('workspace_id');
        })->where('id', $id)->first();

        if (!$category) {
            return null;
        }

        $totalIncome = $category->transactions->where('type', 'income')->sum('amount');
        $totalExpense = $category->transactions->where('type', 'expense')->sum('amount');

        return [
            'category' => $category,
            'total_income' => $totalIncome,
            'total_expense' => abs($totalExpense),
        ];
    }

    public function updateCategory(Category $category, array $data, int $workspaceId)
    {
        if ($category->workspace_id !== null && $category->workspace_id != $workspaceId) {
            return false;
        }

        $category->update($data);
        return $category;
    }

    public function deleteCategory(Category $category, int $workspaceId)
    {
        if ($category->workspace_id !== null && $category->workspace_id != $workspaceId) {
            return false;
        }

        return $category->delete();
    }

    public function mergeCategories(int $fromId, int $toId, int $workspaceId)
    {
        if ($fromId === $toId) {
            return 'Cannot merge category into itself';
        }

        $from = Category::find($fromId);
        $to   = Category::find($toId);

        if (! $from || ! $to) {
            return 'One or both categories not found';
        }

        if (($from->workspace_id !== null && $from->workspace_id != $workspaceId) ||
            ($to->workspace_id !== null && $to->workspace_id != $workspaceId)) {
            return 'Unauthorized';
        }

        DB::transaction(function () use ($from, $to) {
            Transaction::where('category_id', $from->id)
                ->update(['category_id' => $to->id]);

            Category::where('parent_id', $from->id)
                ->update(['parent_id' => $to->id]);

            $from->delete();
        });

        return true;
    }
}
