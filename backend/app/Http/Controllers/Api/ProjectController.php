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

        $projects = Project::where('workspace_id', $workspaceId)
            ->withSum(['transactions as total_income' => function ($query) {
                $query->where('type', 'income');
            }], 'amount')
            ->withSum(['transactions as total_expense' => function ($query) {
                $query->where('type', 'expense');
            }], 'amount')
            ->get();
            
        // Abs the total_expense to be a positive number
        $projects->each(function ($project) {
            $project->total_expense = abs($project->total_expense);
            $project->total_income = $project->total_income ?? 0;
            $project->total_expense = $project->total_expense ?? 0;
            $project->total = $project->total_income - $project->total_expense;
        });

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
            'description' => 'nullable|string',
        ]);

        $project = Project::create([
            'workspace_id' => $workspaceId,
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
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

        $project = Project::with(['transactions.category', 'transactions.account'])->where('workspace_id', $workspaceId)->where('id', $id)->first();
        if (!$project) {
            return response()->json(['error' => 'Project not found.'], 404);
        }

        $totalIncome = $project->transactions->where('type', 'income')->sum('amount');
        $totalExpense = $project->transactions->where('type', 'expense')->sum('amount');

        return response()->json([
            'project' => $project,
            'total_income' => $totalIncome,
            'total_expense' => abs($totalExpense),
        ]);
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
            'description' => 'nullable|string',
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
