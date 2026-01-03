<?php

namespace App\Services;

use App\Models\User;
use App\Repositories\Contracts\AccountRepositoryInterface;
use Illuminate\Support\Collection;
use App\Repositories\Contracts\TransactionRepositoryInterface;
use App\Models\Account;


class AccountService
{
    public function __construct(
        private readonly AccountRepositoryInterface $accounts,
        private readonly TransactionRepositoryInterface $transactions,
    ) {
    }

    public function listForUser(User $user)
    {
        $accounts = $this->accounts->allForUser($user->id);

        return $accounts->map(fn (Account $account) =>
        $this->getSummaryForUserAccount($user, $account)
        );
    }


    public function createForUser(User $user, array $data)
    {
        return $this->accounts->createForUser($user->id, $data);
    }

    public function getSummaryForUserAccount(User $user, Account $account): array
    {
        $income  = $this->transactions->sumForAccount($account->id, $user->id, 'income');
        $expense = $this->transactions->sumForAccount($account->id, $user->id, 'expense');

        $currentBalance = $account->opening_balance + $income - $expense;

        $remainingBudget = null;
        if (! is_null($account->budget_limit)) {
            $remainingBudget = (float) $account->budget_limit - $expense;
        }

        return [
            'id'               => $account->id,
            'name'             => $account->name,
            'type'             => $account->type,
            'currency'         => $account->currency,
            'opening_balance'  => (float) $account->opening_balance,
            'budget_limit'     => $account->budget_limit,
            'total_income'     => (float) $income,
            'total_expense'    => (float) $expense,
            'current_balance'  => (float) $currentBalance,
            'remaining_budget' => $remainingBudget,
            'created_at'       => $account->created_at,
            'updated_at'       => $account->updated_at,
        ];
    }

    public function listWithBalancesForUser(User $user): array
    {
        return Account::query()
            ->where('household_id', $user->household_id)
            ->get()
            ->map(function (Account $account) use ($user) {
                $balance = $this->transactions
                    ->balanceForAccount($account->id, $user->id);

                return [
                    'id'      => $account->id,
                    'name'    => $account->name,
                    'balance' => (float) $balance,
                ];
            })
            ->all();
    }


}
