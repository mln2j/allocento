<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Workspace;
use App\Models\Account;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class WorkspaceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $workspaces = $request->user()->workspaces()->withCount('users')->get();
        return response()->json($workspaces);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', 'in:household,company'],
            'icon' => ['nullable', 'string', 'max:50'],
            'currency' => ['nullable', 'string', 'size:3'],
        ]);

        $workspace = DB::transaction(function () use ($validated, $request) {
            $workspace = Workspace::create([
                'name' => $validated['name'],
                'type' => $validated['type'],
                'icon' => $validated['icon'] ?? '💼',
                'currency' => $validated['currency'] ?? 'EUR',
            ]);

            $workspace->users()->attach($request->user()->id, ['role' => 'owner']);
            return $workspace;
        });

        return response()->json($workspace, 201);
    }

    public function show(Request $request, $id): JsonResponse
    {
        $workspace = $request->user()->workspaces()->where('workspace_id', $id)->with(['users', 'accounts'])->first();

        if (!$workspace) {
            return response()->json(['error' => 'Workspace not found or access denied.'], 404);
        }

        return response()->json($workspace);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $workspace = $request->user()->workspaces()->where('workspace_id', $id)->first();

        if (!$workspace) {
            return response()->json(['error' => 'Workspace not found or access denied.'], 404);
        }

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'icon' => ['nullable', 'string', 'max:50'],
            'currency' => ['sometimes', 'required', 'string', 'size:3'],
        ]);

        $workspace->update($validated);

        return response()->json($workspace);
    }

    public function destroy(Request $request, $id): JsonResponse
    {
        $workspace = $request->user()->workspaces()->where('workspace_id', $id)->first();

        if (!$workspace) {
            return response()->json(['error' => 'Workspace not found or access denied.'], 404);
        }

        if ($workspace->pivot->role !== 'owner') {
            return response()->json(['error' => 'Only the owner can delete the workspace.'], 403);
        }

        if ($workspace->type === 'personal') {
            return response()->json(['error' => 'Personal workspace cannot be deleted.'], 400);
        }

        $workspace->delete();

        return response()->json(['message' => 'Workspace deleted successfully.']);
    }

    public function setFavorite(Request $request, $id): JsonResponse
    {
        $user = $request->user();
        $workspace = $user->workspaces()->where('workspace_id', $id)->first();

        if (!$workspace) {
            return response()->json(['error' => 'Workspace not found or access denied.'], 404);
        }

        $user->update(['favorite_workspace_id' => $workspace->id]);

        return response()->json(['message' => 'Favorite workspace updated.', 'user' => $user->load('favoriteWorkspace')]);
    }

    public function shareAccount(Request $request, $id, $accountId): JsonResponse
    {
        $workspace = $request->user()->workspaces()->where('workspace_id', $id)->first();
        if (!$workspace) {
            return response()->json(['error' => 'Workspace not found or access denied.'], 404);
        }

        $account = Account::where('id', $accountId)->where('created_by_user_id', $request->user()->id)->first();
        if (!$account) {
            return response()->json(['error' => 'Account not found or you are not the owner.'], 404);
        }

        // Share the account
        $workspace->accounts()->syncWithoutDetaching([$account->id]);

        return response()->json(['message' => 'Account shared with workspace successfully.']);
    }

    public function unshareAccount(Request $request, $id, $accountId): JsonResponse
    {
        $workspace = $request->user()->workspaces()->where('workspace_id', $id)->first();
        if (!$workspace) {
            return response()->json(['error' => 'Workspace not found or access denied.'], 404);
        }

        $account = Account::where('id', $accountId)->where('created_by_user_id', $request->user()->id)->first();
        if (!$account) {
            return response()->json(['error' => 'Account not found or you are not the owner.'], 404);
        }

        $workspace->accounts()->detach($account->id);

        return response()->json(['message' => 'Account unshared from workspace successfully.']);
    }

    public function removeMember(Request $request, $id, $userId): JsonResponse
    {
        $workspace = $request->user()->workspaces()->where('workspace_id', $id)->first();
        if (!$workspace) {
            return response()->json(['error' => 'Workspace not found or access denied.'], 404);
        }

        if ($workspace->pivot->role !== 'owner' && $workspace->pivot->role !== 'manager') {
            return response()->json(['error' => 'You do not have permission to manage members.'], 403);
        }

        $targetUser = $workspace->users()->where('users.id', $userId)->first();
        if (!$targetUser) {
            return response()->json(['error' => 'Member not found in this workspace.'], 404);
        }

        if ($targetUser->pivot->role === 'owner') {
            return response()->json(['error' => 'Cannot remove the owner of the workspace.'], 400);
        }

        $workspace->users()->detach($userId);

        return response()->json(['message' => 'Member removed successfully.']);
    }
}
