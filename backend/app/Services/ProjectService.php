<?php

namespace App\Services;

use App\Repositories\Contracts\ProjectRepositoryInterface;
use App\Models\Project;
use App\Models\User;

class ProjectService
{
    protected $projectRepository;

    public function __construct(ProjectRepositoryInterface $projectRepository)
    {
        $this->projectRepository = $projectRepository;
    }

    public function getAllWithTotals(User $user, int $workspaceId)
    {
        $workspace = $user->workspaces()->where('workspaces.id', $workspaceId)->first();
        if (!$workspace) {
            return null;
        }

        $projects = Project::where('workspace_id', $workspaceId)
            ->withSum(['transactions as total_income' => function ($query) {
                $query->where('type', 'income');
            }], 'amount')
            ->withSum(['transactions as total_expense' => function ($query) {
                $query->where('type', 'expense');
            }], 'amount')
            ->get();
            
        $projects->each(function ($project) {
            $project->total_expense = abs($project->total_expense ?? 0);
            $project->total_income = $project->total_income ?? 0;
            $project->total = $project->total_income - $project->total_expense;
        });

        return $projects;
    }

    public function createProject(User $user, int $workspaceId, array $data)
    {
        $workspace = $user->workspaces()->where('workspaces.id', $workspaceId)->first();
        if (!$workspace) {
            return null;
        }

        $data['workspace_id'] = $workspaceId;
        return $this->projectRepository->create($data);
    }

    public function getProjectWithTotals(User $user, int $workspaceId, int $projectId)
    {
        $workspace = $user->workspaces()->where('workspaces.id', $workspaceId)->first();
        if (!$workspace) {
            return null;
        }

        $project = Project::with(['transactions.category', 'transactions.account'])
            ->where('workspace_id', $workspaceId)
            ->where('id', $projectId)
            ->first();
            
        if (!$project) {
            return false;
        }

        $totalIncome = $project->transactions->where('type', 'income')->sum('amount');
        $totalExpense = $project->transactions->where('type', 'expense')->sum('amount');

        return [
            'project' => $project,
            'total_income' => $totalIncome,
            'total_expense' => abs($totalExpense),
        ];
    }

    public function updateProject(User $user, int $workspaceId, int $projectId, array $data)
    {
        $workspace = $user->workspaces()->where('workspaces.id', $workspaceId)->first();
        if (!$workspace) {
            return null;
        }

        $project = Project::where('workspace_id', $workspaceId)->where('id', $projectId)->first();
        if (!$project) {
            return false;
        }

        $project->update($data);
        return $project;
    }

    public function deleteProject(User $user, int $workspaceId, int $projectId)
    {
        $workspace = $user->workspaces()->where('workspaces.id', $workspaceId)->first();
        if (!$workspace) {
            return null;
        }

        $project = Project::where('workspace_id', $workspaceId)->where('id', $projectId)->first();
        if (!$project) {
            return false;
        }

        return $project->delete();
    }
}
