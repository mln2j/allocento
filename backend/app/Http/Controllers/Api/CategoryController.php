<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Services\CategoryService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class CategoryController extends Controller
{
    protected $categoryService;

    public function __construct(CategoryService $categoryService)
    {
        $this->categoryService = $categoryService;
    }

    public function index(Request $request)
    {
        $workspaceId = $request->header('X-Workspace-Id');
        if (!$workspaceId) {
            return response()->json(['error' => 'Workspace ID is required.'], 400);
        }

        $categories = $this->categoryService->getAllForWorkspace($workspaceId);
        return response()->json($categories);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', 'in:income,expense'],
        ]);

        $workspaceId = $request->header('X-Workspace-Id');
        if (!$workspaceId) {
            return response()->json(['error' => 'Workspace ID is required.'], 400);
        }

        $data['workspace_id'] = $workspaceId;
        $category = $this->categoryService->createCategory($data);

        return response()->json($category, Response::HTTP_CREATED);
    }

    public function show(Request $request, $id)
    {
        $workspaceId = $request->header('X-Workspace-Id');
        if (!$workspaceId) {
            return response()->json(['error' => 'Workspace ID is required.'], 400);
        }

        $result = $this->categoryService->getCategoryWithTotals($id, $workspaceId);
        if (!$result) {
            return response()->json(['error' => 'Category not found.'], 404);
        }

        return response()->json($result);
    }

    public function update(Request $request, Category $category)
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'type' => ['sometimes', 'required', 'in:income,expense'],
        ]);

        $workspaceId = $request->header('X-Workspace-Id');
        $updated = $this->categoryService->updateCategory($category, $data, $workspaceId);

        if (!$updated) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        return response()->json($updated);
    }

    public function destroy(Request $request, Category $category)
    {
        $workspaceId = $request->header('X-Workspace-Id');
        $deleted = $this->categoryService->deleteCategory($category, $workspaceId);

        if (!$deleted) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        return response()->json([], Response::HTTP_NO_CONTENT);
    }

    public function merge(Request $request, int $fromId, int $toId)
    {
        $workspaceId = $request->header('X-Workspace-Id');
        $result = $this->categoryService->mergeCategories($fromId, $toId, $workspaceId);

        if (is_string($result)) {
            $status = Response::HTTP_BAD_REQUEST;
            if ($result === 'Unauthorized') $status = 403;
            if ($result === 'One or both categories not found') $status = 404;
            if ($result === 'Cannot merge category into itself') $status = 422;

            return response()->json(['error' => $result], $status);
        }

        return response()->json(['message' => 'Categories merged']);
    }
}
