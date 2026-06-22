<?php

namespace App\Repositories\Contracts;

interface WorkspaceRepositoryInterface
{
    public function getAllForUser(int $userId);
    public function findById(int $id);
    public function create(array $data);
    public function update(int $id, array $data);
    public function delete(int $id);
    public function addUser(int $workspaceId, int $userId, string $role);
    public function removeUser(int $workspaceId, int $userId);
    public function updateSettings(int $workspaceId, array $settings);
}
