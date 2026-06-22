<?php

namespace App\Services;

use App\Repositories\Contracts\WorkspaceRepositoryInterface;
use App\Models\User;
use App\Models\Workspace;
use App\Models\Account;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;

class WorkspaceService
{
    protected $workspaceRepository;

    public function __construct(WorkspaceRepositoryInterface $workspaceRepository)
    {
        $this->workspaceRepository = $workspaceRepository;
    }

    public function getAllForUser(int $userId)
    {
        return $this->workspaceRepository->getAllForUser($userId);
    }

    public function createWorkspace(array $data, int $ownerId)
    {
        if (empty($data['workspace_id'])) {
            $data['workspace_id'] = (string) Str::uuid();
        }

        $workspace = $this->workspaceRepository->create($data);
        $this->workspaceRepository->addUser($workspace->id, $ownerId, 'owner');

        return $workspace;
    }

    public function getWorkspaceById(int $id)
    {
        return $this->workspaceRepository->findById($id);
    }

    public function updateWorkspace(User $user, int $id, array $data)
    {
        $workspace = $user->workspaces()->where('workspaces.id', $id)->first();
        if (!$workspace) {
            return false;
        }

        if ($workspace->pivot->role !== 'owner' && $workspace->pivot->role !== 'manager') {
            return 'Unauthorized';
        }

        $workspace->update($data);
        return $workspace;
    }

    public function deleteWorkspace(User $user, int $id)
    {
        $workspace = $user->workspaces()->where('workspaces.id', $id)->first();
        if (!$workspace) {
            return false;
        }

        if ($workspace->pivot->role !== 'owner') {
            return 'Only the owner can delete the workspace.';
        }

        if ($workspace->type === 'personal') {
            return 'Personal workspace cannot be deleted.';
        }

        $workspace->delete();
        return true;
    }

    public function setFavorite(User $user, int $id)
    {
        $workspace = $user->workspaces()->where('workspaces.id', $id)->first();
        if (!$workspace) {
            return false;
        }

        $user->update(['favorite_workspace_id' => $workspace->id]);
        return $user->load('favoriteWorkspace');
    }

    public function shareAccount(User $user, int $workspaceId, int $accountId)
    {
        $workspace = $user->workspaces()->where('workspaces.id', $workspaceId)->first();
        if (!$workspace) {
            return 'Workspace not found';
        }

        $account = Account::with('owningWorkspace')->where('id', $accountId)->where('created_by_user_id', $user->id)->first();
        if (!$account) {
            return 'Account not found';
        }

        $owningWorkspace = $account->owningWorkspace;
        if ($owningWorkspace && $owningWorkspace->type !== 'personal') {
            $userRole = $owningWorkspace->users()->where('users.id', $user->id)->first()?->pivot->role;
            if ($userRole !== 'owner' && $userRole !== 'manager') {
                return 'Unauthorized';
            }
        }

        $workspace->accounts()->syncWithoutDetaching([$account->id]);
        return true;
    }

    public function unshareAccount(User $user, int $workspaceId, int $accountId)
    {
        $workspace = $user->workspaces()->where('workspaces.id', $workspaceId)->first();
        if (!$workspace) {
            return 'Workspace not found';
        }

        $account = Account::with('owningWorkspace')->where('id', $accountId)->where('created_by_user_id', $user->id)->first();
        if (!$account) {
            return 'Account not found';
        }

        $owningWorkspace = $account->owningWorkspace;
        if ($owningWorkspace && $owningWorkspace->type !== 'personal') {
            $userRole = $owningWorkspace->users()->where('users.id', $user->id)->first()?->pivot->role;
            if ($userRole !== 'owner' && $userRole !== 'manager') {
                return 'Unauthorized';
            }
        }

        $workspace->accounts()->detach($account->id);
        return true;
    }

    public function removeMember(User $user, int $workspaceId, int $targetUserId)
    {
        $workspace = $user->workspaces()->where('workspaces.id', $workspaceId)->first();
        if (!$workspace) {
            return 'Workspace not found';
        }

        if ($workspace->pivot->role !== 'owner' && $workspace->pivot->role !== 'manager') {
            return 'Unauthorized';
        }

        $targetUser = $workspace->users()->where('users.id', $targetUserId)->first();
        if (!$targetUser) {
            return 'Member not found';
        }

        if ($targetUser->pivot->role === 'owner') {
            return 'Cannot remove owner';
        }

        $workspace->users()->detach($targetUserId);
        return true;
    }

    public function updateMemberRole(User $user, int $workspaceId, int $targetUserId, string $role)
    {
        $workspace = $user->workspaces()->where('workspaces.id', $workspaceId)->first();
        if (!$workspace) {
            return 'Workspace not found';
        }

        if ($workspace->pivot->role !== 'owner') {
            return 'Unauthorized';
        }

        $targetUser = $workspace->users()->where('users.id', $targetUserId)->first();
        if (!$targetUser) {
            return 'Member not found';
        }

        if ($targetUser->pivot->role === 'owner') {
            return 'Cannot change owner role';
        }

        if ($role === 'owner') {
            DB::transaction(function() use ($workspace, $targetUserId, $user) {
                $workspace->users()->updateExistingPivot($targetUserId, ['role' => 'owner']);
                $workspace->users()->updateExistingPivot($user->id, ['role' => 'manager']);
            });
            return 'transfer';
        }

        $workspace->users()->updateExistingPivot($targetUserId, ['role' => $role]);
        return true;
    }

    public function leaveWorkspace(User $user, int $workspaceId)
    {
        $workspace = $user->workspaces()->where('workspaces.id', $workspaceId)->first();
        if (!$workspace) {
            return 'Workspace not found';
        }

        if ($workspace->pivot->role === 'owner') {
            return 'Owner cannot leave';
        }

        $workspace->users()->detach($user->id);

        if ($user->favorite_workspace_id === $workspace->id) {
            $personal = $user->workspaces()->where('type', 'personal')->first();
            $user->update(['favorite_workspace_id' => $personal?->id]);
        }

        return true;
    }
}
