<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class ProjectController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $workspaceId = $request->header('X-Workspace-Id');
        if (!$workspaceId) {
            return response()->json(['error' => 'Workspace ID is required.'], 400);
        }

        $workspace = $request->user()->workspaces()->where('workspace_id', $workspaceId)->first();
        if (!$workspace) {
             return response()->json(['error' => 'Workspace not found or access denied.'], 403);
        }

        $projects = Project::where('workspace_id', $workspaceId)->get();
        return response()->json($projects);
    }

    public function store(Request $request): JsonResponse
    {
        $workspaceId = $request->header('X-Workspace-Id');
        if (!$workspaceId) {
            return response()->json(['error' => 'Workspace ID is required.'], 400);
        }

        $workspace = $request->user()->workspaces()->where('workspace_id', $workspaceId)->first();
        if (!$workspace) {
             return response()->json(['error' => 'Workspace not found or access denied.'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'color' => 'nullable|string|max:20',
            'description' => 'nullable|string',
            'status' => 'nullable|in:active,completed',
        ]);

        $project = Project::create([
            'workspace_id' => $workspaceId,
            'name' => $validated['name'],
            'color' => $validated['color'] ?? '#4f46e5',
            'description' => $validated['description'] ?? null,
            'status' => $validated['status'] ?? 'active',
        ]);

        return response()->json($project, 201);
    }

    public function show(Request $request, $id): JsonResponse
    {
        $workspaceId = $request->header('X-Workspace-Id');
        $workspace = $request->user()->workspaces()->where('workspace_id', $workspaceId)->first();
        if (!$workspace) {
             return response()->json(['error' => 'Workspace not found or access denied.'], 403);
        }

        $project = Project::where('workspace_id', $workspaceId)->where('id', $id)->first();
        if (!$project) {
            return response()->json(['error' => 'Project not found.'], 404);
        }

        return response()->json($project);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $workspaceId = $request->header('X-Workspace-Id');
        $workspace = $request->user()->workspaces()->where('workspace_id', $workspaceId)->first();
        if (!$workspace) {
             return response()->json(['error' => 'Workspace not found or access denied.'], 403);
        }

        $project = Project::where('workspace_id', $workspaceId)->where('id', $id)->first();
        if (!$project) {
            return response()->json(['error' => 'Project not found.'], 404);
        }

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'color' => 'nullable|string|max:20',
            'description' => 'nullable|string',
            'status' => 'nullable|in:active,completed',
        ]);

        $project->update($validated);

        return response()->json($project);
    }

    public function destroy(Request $request, $id): JsonResponse
    {
        $workspaceId = $request->header('X-Workspace-Id');
        $workspace = $request->user()->workspaces()->where('workspace_id', $workspaceId)->first();
        if (!$workspace) {
             return response()->json(['error' => 'Workspace not found or access denied.'], 403);
        }

        $project = Project::where('workspace_id', $workspaceId)->where('id', $id)->first();
        if (!$project) {
            return response()->json(['error' => 'Project not found.'], 404);
        }

        // To do: if transactions are linked, should we prevent delete or nullify project_id?
        // Since project_id is nullOnDelete, it will nullify automatically.

        $project->delete();

        return response()->json(null, 204);
    }
}
