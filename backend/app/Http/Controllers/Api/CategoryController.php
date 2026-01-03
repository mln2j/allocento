<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Transaction;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;

class CategoryController extends Controller
{
    public function index()
    {
        $categories = Category::orderBy('name')->get();

        return response()->json($categories);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name'      => ['required', 'string', 'max:255'],
            'type'      => ['required', 'string', 'max:50'],
            'parent_id' => ['nullable', 'exists:categories,id'],
        ]);

        $category = Category::create($data);

        return response()->json($category, Response::HTTP_CREATED);
    }

    public function update(Request $request, Category $category)
    {
        $data = $request->validate([
            'name'      => ['sometimes', 'string', 'max:255'],
            'type'      => ['sometimes', 'string', 'max:50'],
            'parent_id' => ['nullable', 'exists:categories,id'],
        ]);

        $category->update($data);

        return response()->json($category);
    }

    public function destroy(Category $category)
    {
        $category->delete();

        return response()->json([], Response::HTTP_NO_CONTENT);
    }

    public function merge(int $fromId, int $toId)
    {
        if ($fromId === $toId) {
            return response()->json([
                'message' => 'Cannot merge category into itself',
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $from = Category::find($fromId);
        $to   = Category::find($toId);

        if (! $from || ! $to) {
            return response()->json([
                'message' => 'One or both categories not found',
            ], Response::HTTP_NOT_FOUND);
        }

        if ($from->type !== $to->type) {
            return response()->json([
                'message' => 'Cannot merge categories of different types',
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        DB::transaction(function () use ($from, $to) {
            Transaction::where('category_id', $from->id)
                ->update(['category_id' => $to->id]);

            Category::where('parent_id', $from->id)
                ->update(['parent_id' => $to->id]);

            $from->delete();
        });

        return response()->json(['message' => 'Categories merged']);
    }

}
