<?php

namespace App\Repositories\Eloquent;

use App\Models\Transaction;
use App\Repositories\Contracts\TransactionRepositoryInterface;
use Illuminate\Support\Collection;

class EloquentTransactionRepository implements TransactionRepositoryInterface
{
    public function allForAccount(int $accountId, int $userId): Collection
    {
        return Transaction::query()
            ->where('account_id', $accountId)
            ->where('user_id', $userId)
            ->orderByDesc('date')
            ->get();
    }

    public function createForAccount(int $accountId, int $userId, array $data): Transaction
    {
        $data['account_id'] = $accountId;
        $data['user_id']    = $userId;

        return Transaction::create($data);
    }

    public function sumForAccount(int $accountId, int $userId, ?string $type = null): float
    {
        $query = Transaction::query()
            ->where('account_id', $accountId)
            ->where('user_id', $userId);

        if ($type) {
            $query->where('type', $type);
        }

        return (float) $query->sum('amount');
    }

    public function sumForProject(int $projectId, int $userId, ?string $type = null): float
    {
        $query = Transaction::query()
            ->where('project_id', $projectId)
            ->where('user_id', $userId);

        if ($type) {
            $query->where('type', $type);
        }

        return (float) $query->sum('amount');
    }

}
