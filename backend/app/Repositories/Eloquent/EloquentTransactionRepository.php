<?php

namespace App\Repositories\Eloquent;

use App\Models\Transaction;
use App\Repositories\Contracts\TransactionRepositoryInterface;
use Illuminate\Support\Collection;

class EloquentTransactionRepository implements TransactionRepositoryInterface
{
    public function allForAccount(int $accountId): Collection
    {
        return Transaction::query()
            ->with('createdBy')
            ->where('account_id', $accountId)
            ->orderByDesc('date')
            ->get();
    }

    public function createForAccount(int $accountId, int $userId, array $data): Transaction
    {
        $data['account_id'] = $accountId;
        $data['created_by_user_id'] = $userId;

        return Transaction::create($data);
    }

    public function sumForAccount(int $accountId, ?string $type = null): float
    {
        $query = Transaction::query()
            ->where('account_id', $accountId);

        if ($type) {
            $query->where('type', $type);
        }

        return (float) $query->sum('amount');
    }

    public function balanceForAccount(int $accountId): float
    {
        $income = Transaction::query()
            ->where('account_id', $accountId)
            ->where('type', 'income')
            ->sum('amount');

        $expense = Transaction::query()
            ->where('account_id', $accountId)
            ->where('type', 'expense')
            ->sum('amount');

        return (float) $income - (float) $expense;
    }


}
