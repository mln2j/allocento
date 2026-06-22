<?php

namespace App\Repositories\Contracts;

interface ProjectRepositoryInterface
{
    public function getAllForWorkspace(int $workspaceId);
    public function create(array $data);
    public function findById(int $id);
    public function update(int $id, array $data);
    public function delete(int $id);
}
