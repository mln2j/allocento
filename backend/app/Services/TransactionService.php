<?php

namespace App\Services;

use App\Models\Transaction;
use App\Models\User;
use App\Repositories\Contracts\TransactionRepositoryInterface;
use Illuminate\Support\Collection;

class TransactionService
{
    public function __construct(
        private readonly TransactionRepositoryInterface $transactions
    ) {
    }

    public function listForAccount(User $user, int $accountId): Collection
    {
        return $this->transactions->allForAccount($accountId, $user->id);
    }

    public function createForAccount(User $user, int $accountId, array $data)
    {
        return $this->transactions->createForAccount($accountId, $user->id, $data);
    }

    public function updateForAccount(User $user, int $accountId, int $transactionId, array $data): Transaction
    {
        $transaction = Transaction::query()
            ->where('id', $transactionId)
            ->where('account_id', $accountId)
            ->where('user_id', $user->id)
            ->firstOrFail();

        $transaction->update($data);

        return $transaction->fresh();
    }

    public function deleteForAccount(User $user, int $accountId, int $transactionId): void
    {
        $transaction = Transaction::query()
            ->where('id', $transactionId)
            ->where('account_id', $accountId)
            ->where('user_id', $user->id)
            ->firstOrFail();

        $transaction->delete();
    }
}
