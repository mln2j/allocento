<?php

namespace App\Repositories\Eloquent;

use App\Models\Category;
use App\Repositories\Contracts\CategoryRepositoryInterface;

class EloquentCategoryRepository implements CategoryRepositoryInterface
{
    public function getAllForWorkspace(int $workspaceId)
    {
        return Category::where(function($q) use ($workspaceId) {
            $q->where('workspace_id', $workspaceId)
              ->orWhereNull('workspace_id');
        })->orderBy('name')->get();
    }

    public function create(array $data)
    {
        return Category::create($data);
    }

    public function findById(int $id)
    {
        return Category::find($id);
    }

    public function update(int $id, array $data)
    {
        $category = Category::find($id);
        if ($category) {
            $category->update($data);
            return $category;
        }
        return null;
    }

    public function delete(int $id)
    {
        $category = Category::find($id);
        if ($category) {
            return $category->delete();
        }
        return false;
    }
}
