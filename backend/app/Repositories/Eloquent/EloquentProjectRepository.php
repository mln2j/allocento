<?php

namespace App\Repositories\Eloquent;

use App\Models\Project;
use App\Repositories\Contracts\ProjectRepositoryInterface;

class EloquentProjectRepository implements ProjectRepositoryInterface
{
    public function getAllForWorkspace(int $workspaceId)
    {
        return Project::where('workspace_id', $workspaceId)->orderBy('name')->get();
    }

    public function create(array $data)
    {
        return Project::create($data);
    }

    public function findById(int $id)
    {
        return Project::find($id);
    }

    public function update(int $id, array $data)
    {
        $project = Project::find($id);
        if ($project) {
            $project->update($data);
            return $project;
        }
        return null;
    }

    public function delete(int $id)
    {
        $project = Project::find($id);
        if ($project) {
            return $project->delete();
        }
        return false;
    }
}
