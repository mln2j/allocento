<?php

namespace App\Services;

use App\Models\Project;
use App\Models\User;
use App\Repositories\Contracts\TransactionRepositoryInterface;

class ProjectService
{
    public function __construct(
        private readonly TransactionRepositoryInterface $transactions
    ) {
    }

    public function getSummaryForUserProject(User $user, int $projectId): ?array
    {
        $project = Project::query()
            ->where('id', $projectId)
            ->where('organization_id', $user->organization_id)
            ->first();

        if (! $project) {
            return null;
        }

        $income  = $this->transactions->sumForProject($project->id, $user->id, 'income');
        $expense = $this->transactions->sumForProject($project->id, $user->id, 'expense');

        $remaining = null;
        if (! is_null($project->planned_budget)) {
            $remaining = max(0, (float) $project->planned_budget - $expense);
        }

        return [
            'project_id'       => $project->id,
            'project_name'     => $project->name,
            'planned_budget'   => $project->planned_budget,
            'total_income'     => (float) $income,
            'total_expense'    => (float) $expense,
            'remaining_budget' => $remaining,
        ];
    }

}
