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
        return $this->transactions->allForAccount($accountId);
    }

    public function createForAccount(User $user, int $accountId, array $data): Transaction
    {
        return DB::transaction(function () use ($user, $accountId, $data) {
            $isTransfer = ($data['type'] ?? '') === 'transfer';

            if ($isTransfer) {
                $targetAccountId = $data['target_account_id'] ?? null;
                if (!$targetAccountId) {
                    throw new \InvalidArgumentException('Target account is required for transfers.');
                }

                // 1. Create source transaction (expense)
                $sourceData = array_merge($data, [
                    'type' => 'expense',
                    'exclude_from_analytics' => true,
                ]);
                $tx = $this->transactions->createForAccount($accountId, $user->id, $sourceData);

                // 2. Create destination transaction (income)
                $targetData = array_merge($data, [
                    'type' => 'income',
                    'exclude_from_analytics' => true,
                    'target_account_id' => $accountId, // point back to source
                ]);
                $this->transactions->createForAccount($targetAccountId, $user->id, $targetData);

                // 3. Update both balances
                $sourceAccount = Account::where('id', $accountId)->lockForUpdate()->firstOrFail();
                $targetAccount = Account::where('id', $targetAccountId)->lockForUpdate()->firstOrFail();

                $sourceAccount->balance -= $tx->amount;
                $sourceAccount->save();

                $targetAccount->balance += $tx->amount;
                $targetAccount->save();

                return $tx;
            }

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
                ->firstOrFail();

            $account = Account::query()
                ->where('id', $accountId)
                ->lockForUpdate()
                ->firstOrFail();

            // Handle counterpart if it's a transfer
            if ($transaction->target_account_id) {
                $counterpart = Transaction::query()
                    ->where('account_id', $transaction->target_account_id)
                    ->where('target_account_id', $transaction->account_id)
                    ->where('amount', $transaction->amount)
                    ->where('date', $transaction->date)
                    ->first();

                if ($counterpart) {
                    $targetAccount = Account::where('id', $counterpart->account_id)->lockForUpdate()->firstOrFail();
                    
                    // Revert counterpart old balance effect
                    $oldTargetDelta = $counterpart->type === 'income' ? $counterpart->amount : -$counterpart->amount;
                    $targetAccount->balance -= $oldTargetDelta;

                    // Update counterpart data
                    $counterpartData = array_merge($data, [
                        'type' => $counterpart->type,
                        'exclude_from_analytics' => true,
                        'target_account_id' => $accountId,
                    ]);
                    $counterpart->update($counterpartData);
                    $counterpart->refresh();

                    // Apply new balance effect
                    $newTargetDelta = $counterpart->type === 'income' ? $counterpart->amount : -$counterpart->amount;
                    $targetAccount->balance += $newTargetDelta;
                    $targetAccount->save();
                }
            }

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
                ->firstOrFail();

            $account = Account::query()
                ->where('id', $accountId)
                ->lockForUpdate()
                ->firstOrFail();

            // Handle counterpart if it's a transfer
            if ($transaction->target_account_id) {
                $counterpart = Transaction::query()
                    ->where('account_id', $transaction->target_account_id)
                    ->where('target_account_id', $transaction->account_id)
                    ->where('amount', $transaction->amount)
                    ->where('date', $transaction->date)
                    ->first();

                if ($counterpart) {
                    $targetAccount = Account::where('id', $counterpart->account_id)->lockForUpdate()->firstOrFail();
                    $targetDelta = $counterpart->type === 'income' ? $counterpart->amount : -$counterpart->amount;
                    $targetAccount->balance -= $targetDelta;
                    $targetAccount->save();

                    $counterpart->delete();
                }
            }

            $delta = $transaction->type === 'income'
                ? $transaction->amount
                : -$transaction->amount;

            $account->balance -= $delta;
            $account->save();

            $transaction->delete();
        });
    }
}
