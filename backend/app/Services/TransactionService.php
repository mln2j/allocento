<?php

namespace App\Services;

use App\Models\Account;
use App\Models\Transaction;
use App\Models\User;
use App\Repositories\Contracts\TransactionRepositoryInterface;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

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

    public function createForAccount(User $user, int $accountId, array $data): Transaction
    {
        return DB::transaction(function () use ($user, $accountId, $data) {
            $tx = $this->transactions->createForAccount($accountId, $user->id, $data);

            $account = Account::query()
                ->where('id', $accountId)
                ->lockForUpdate()
                ->firstOrFail();

            $delta = $tx->type === 'income'
                ? $tx->amount
                : -$tx->amount;

            $account->balance += $delta;
            $account->save();

            return $tx;
        });
    }

    public function updateForAccount(User $user, int $accountId, int $transactionId, array $data): Transaction
    {
        return DB::transaction(function () use ($user, $accountId, $transactionId, $data) {
            $transaction = Transaction::query()
                ->where('id', $transactionId)
                ->where('account_id', $accountId)
                ->where('user_id', $user->id)
                ->firstOrFail();

            $account = Account::query()
                ->where('id', $accountId)
                ->lockForUpdate()
                ->firstOrFail();

            $oldDelta = $transaction->type === 'income'
                ? $transaction->amount
                : -$transaction->amount;

            $account->balance -= $oldDelta;

            $transaction->update($data);
            $transaction->refresh();

            $newDelta = $transaction->type === 'income'
                ? $transaction->amount
                : -$transaction->amount;

            $account->balance += $newDelta;
            $account->save();

            return $transaction;
        });
    }

    public function deleteForAccount(User $user, int $accountId, int $transactionId): void
    {
        DB::transaction(function () use ($user, $accountId, $transactionId) {
            $transaction = Transaction::query()
                ->where('id', $transactionId)
                ->where('account_id', $accountId)
                ->where('user_id', $user->id)
                ->firstOrFail();

            $account = Account::query()
                ->where('id', $accountId)
                ->lockForUpdate()
                ->firstOrFail();

            $delta = $transaction->type === 'income'
                ? $transaction->amount
                : -$transaction->amount;

            $account->balance -= $delta;
            $account->save();

            $transaction->delete();
        });
    }
}
