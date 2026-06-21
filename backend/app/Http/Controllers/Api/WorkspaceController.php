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
            'type' => ['required', 'in:personal,household,company'],
            'icon' => ['nullable', 'string', 'max:50'],
            'currency' => ['nullable', 'string', 'size:3'],
        ]);

        $workspace = DB::transaction(function () use ($validated, $request) {
            $workspace = Workspace::create([
                'name' => $validated['name'],
                'type' => $validated['type'],
                'icon' => $validated['icon'] ?? '💼',
                'currency' => $validated['currency'] ?? 'EUR',
                'enabled_features' => ['categories', 'projects'],
            ]);

            $workspace->users()->attach($request->user()->id, ['role' => 'owner']);
            return $workspace;
        });

        return response()->json($workspace, 201);
    }

    public function show(Request $request, $id): JsonResponse
    {
        $workspace = $request->user()->workspaces()->where('workspaces.id', $id)->with(['users', 'accounts'])->first();

        if (!$workspace) {
            return response()->json(['error' => 'Workspace not found or access denied.'], 404);
        }

        return response()->json($workspace);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $workspace = $request->user()->workspaces()->where('workspaces.id', $id)->first();

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
        $workspace = $request->user()->workspaces()->where('workspaces.id', $id)->first();

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
        $workspace = $user->workspaces()->where('workspaces.id', $id)->first();

        if (!$workspace) {
            return response()->json(['error' => 'Workspace not found or access denied.'], 404);
        }

        $user->update(['favorite_workspace_id' => $workspace->id]);

        return response()->json(['message' => 'Favorite workspace updated.', 'user' => $user->load('favoriteWorkspace')]);
    }

    public function shareAccount(Request $request, $id, $accountId): JsonResponse
    {
        $workspace = $request->user()->workspaces()->where('workspaces.id', $id)->first();
        if (!$workspace) {
            return response()->json(['error' => 'Workspace not found or access denied.'], 404);
        }

        $account = Account::with('owningWorkspace')->where('id', $accountId)->where('created_by_user_id', $request->user()->id)->first();
        if (!$account) {
            return response()->json(['error' => 'Account not found or you are not the owner.'], 404);
        }

        // Check ownership/permissions for sharing
        $owningWorkspace = $account->owningWorkspace;
        if ($owningWorkspace && $owningWorkspace->type !== 'personal') {
            $userRole = $owningWorkspace->users()->where('users.id', $request->user()->id)->first()?->pivot->role;
            if ($userRole !== 'owner' && $userRole !== 'manager') {
                return response()->json(['error' => 'Only the owner or manager of the org/household can share this account.'], 403);
            }
        }

        // Share the account
        $workspace->accounts()->syncWithoutDetaching([$account->id]);

        return response()->json(['message' => 'Account shared with workspace successfully.']);
    }

    public function unshareAccount(Request $request, $id, $accountId): JsonResponse
    {
        $workspace = $request->user()->workspaces()->where('workspaces.id', $id)->first();
        if (!$workspace) {
            return response()->json(['error' => 'Workspace not found or access denied.'], 404);
        }

        $account = Account::with('owningWorkspace')->where('id', $accountId)->where('created_by_user_id', $request->user()->id)->first();
        if (!$account) {
            return response()->json(['error' => 'Account not found or you are not the owner.'], 404);
        }

        // Check ownership/permissions for unsharing
        $owningWorkspace = $account->owningWorkspace;
        if ($owningWorkspace && $owningWorkspace->type !== 'personal') {
            $userRole = $owningWorkspace->users()->where('users.id', $request->user()->id)->first()?->pivot->role;
            if ($userRole !== 'owner' && $userRole !== 'manager') {
                return response()->json(['error' => 'Only the owner or manager of the org/household can unshare this account.'], 403);
            }
        }

        $workspace->accounts()->detach($account->id);

        return response()->json(['message' => 'Account unshared from workspace successfully.']);
    }

    public function removeMember(Request $request, $id, $userId): JsonResponse
    {
        $workspace = $request->user()->workspaces()->where('workspaces.id', $id)->first();
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

    public function updateMemberRole(Request $request, $id, $userId): JsonResponse
    {
        $workspace = $request->user()->workspaces()->where('workspaces.id', $id)->first();
        if (!$workspace) {
            return response()->json(['error' => 'Workspace not found or access denied.'], 404);
        }

        // Only owner can change roles, or maybe manager can change member roles? Let's restrict to owner.
        if ($workspace->pivot->role !== 'owner') {
            return response()->json(['error' => 'Only the owner can change member roles.'], 403);
        }

        $targetUser = $workspace->users()->where('users.id', $userId)->first();
        if (!$targetUser) {
            return response()->json(['error' => 'Member not found in this workspace.'], 404);
        }

        if ($targetUser->pivot->role === 'owner') {
            return response()->json(['error' => 'Cannot change the role of the owner.'], 400);
        }

        $validated = $request->validate([
            'role' => ['required', 'in:member,manager']
        ]);

        $workspace->users()->updateExistingPivot($userId, ['role' => $validated['role']]);

        return response()->json(['message' => 'Member role updated successfully.']);
    }

    public function leave(Request $request, $id): JsonResponse
    {
        $user = $request->user();
        $workspace = $user->workspaces()->where('workspaces.id', $id)->first();

        if (!$workspace) {
            return response()->json(['error' => 'Workspace not found or access denied.'], 404);
        }

        if ($workspace->pivot->role === 'owner') {
            return response()->json(['error' => 'Owner cannot leave the workspace. Delete it instead or transfer ownership.'], 400);
        }

        $workspace->users()->detach($user->id);

        if ($user->favorite_workspace_id === $workspace->id) {
            $personal = $user->workspaces()->where('type', 'personal')->first();
            $user->update(['favorite_workspace_id' => $personal?->id]);
        }

        return response()->json(['message' => 'Left workspace successfully.']);
    }
}
