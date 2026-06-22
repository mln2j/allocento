<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ProjectService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class ProjectController extends Controller
{
    protected $projectService;

    public function __construct(ProjectService $projectService)
    {
        $this->projectService = $projectService;
    }

    public function index(Request $request): JsonResponse
    {
        $workspaceId = $request->header('X-Workspace-Id');
        if (!$workspaceId) {
            return response()->json(['error' => 'Workspace ID is required.'], 400);
        }

        $projects = $this->projectService->getAllWithTotals($request->user(), $workspaceId);
        
        if ($projects === null) {
            return response()->json(['error' => 'Workspace not found or access denied.'], 403);
        }

        return response()->json($projects);
    }

    public function store(Request $request): JsonResponse
    {
        $workspaceId = $request->header('X-Workspace-Id');
        if (!$workspaceId) {
            return response()->json(['error' => 'Workspace ID is required.'], 400);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);

        $project = $this->projectService->createProject($request->user(), $workspaceId, $validated);

        if ($project === null) {
            return response()->json(['error' => 'Workspace not found or access denied.'], 403);
        }

        return response()->json($project, 201);
    }

    public function show(Request $request, $id): JsonResponse
    {
        $workspaceId = $request->header('X-Workspace-Id');
        if (!$workspaceId) {
            return response()->json(['error' => 'Workspace ID is required.'], 400);
        }

        $result = $this->projectService->getProjectWithTotals($request->user(), $workspaceId, $id);

        if ($result === null) {
            return response()->json(['error' => 'Workspace not found or access denied.'], 403);
        }
        
        if ($result === false) {
            return response()->json(['error' => 'Project not found.'], 404);
        }

        return response()->json($result);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $workspaceId = $request->header('X-Workspace-Id');
        if (!$workspaceId) {
            return response()->json(['error' => 'Workspace ID is required.'], 400);
        }

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
        ]);

        $project = $this->projectService->updateProject($request->user(), $workspaceId, $id, $validated);

        if ($project === null) {
            return response()->json(['error' => 'Workspace not found or access denied.'], 403);
        }
        
        if ($project === false) {
            return response()->json(['error' => 'Project not found.'], 404);
        }

        return response()->json($project);
    }

    public function destroy(Request $request, $id): JsonResponse
    {
        $workspaceId = $request->header('X-Workspace-Id');
        if (!$workspaceId) {
            return response()->json(['error' => 'Workspace ID is required.'], 400);
        }

        $deleted = $this->projectService->deleteProject($request->user(), $workspaceId, $id);

        if ($deleted === null) {
            return response()->json(['error' => 'Workspace not found or access denied.'], 403);
        }

        if ($deleted === false) {
            return response()->json(['error' => 'Project not found.'], 404);
        }

        return response()->json(null, 204);
    }
}
