<?php

namespace App\Repositories\Eloquent;

use App\Models\Workspace;
use App\Repositories\Contracts\WorkspaceRepositoryInterface;

class EloquentWorkspaceRepository implements WorkspaceRepositoryInterface
{
    public function getAllForUser(int $userId)
    {
        // Pretpostavlja se da postoji many-to-many relacija preko modela User
        $user = \App\Models\User::find($userId);
        return $user ? $user->workspaces()->withPivot('role')->get() : collect();
    }

    public function findById(int $id)
    {
        return Workspace::with('users')->find($id);
    }

    public function create(array $data)
    {
        return Workspace::create($data);
    }

    public function update(int $id, array $data)
    {
        $workspace = Workspace::find($id);
        if ($workspace) {
            $workspace->update($data);
            return $workspace;
        }
        return null;
    }

    public function delete(int $id)
    {
        $workspace = Workspace::find($id);
        if ($workspace) {
            return $workspace->delete();
        }
        return false;
    }

    public function addUser(int $workspaceId, int $userId, string $role)
    {
        $workspace = Workspace::find($workspaceId);
        if ($workspace) {
            $workspace->users()->attach($userId, ['role' => $role]);
        }
    }

    public function removeUser(int $workspaceId, int $userId)
    {
        $workspace = Workspace::find($workspaceId);
        if ($workspace) {
            $workspace->users()->detach($userId);
        }
    }

    public function updateSettings(int $workspaceId, array $settings)
    {
        $workspace = Workspace::find($workspaceId);
        if ($workspace) {
            $workspace->enabled_features = $settings;
            $workspace->save();
            return $workspace;
        }
        return null;
    }
}
