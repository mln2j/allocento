<?php

namespace App\Services;

use App\Models\Household;
use App\Models\User;
use App\Repositories\Contracts\TransactionRepositoryInterface;

class HouseholdService
{
    public function __construct(
        private readonly TransactionRepositoryInterface $transactions
    ) {
    }

    public function getSummaryForUser(User $user): ?array
    {
        $household = $user->household;

        if (! $household) {
            return null;
        }

        $accounts = $household->accounts;

        $totalIncome  = 0.0;
        $totalExpense = 0.0;
        $currentBalance = 0.0;

        foreach ($accounts as $account) {
            $income  = $this->transactions->sumForAccount($account->id, $user->id, 'income');
            $expense = $this->transactions->sumForAccount($account->id, $user->id, 'expense');

            $totalIncome  += $income;
            $totalExpense += $expense;
            $currentBalance += $account->opening_balance + $income - $expense;
        }

        return [
            'household_id'     => $household->id,
            'household_name'   => $household->name,
            'total_accounts'   => $accounts->count(),
            'total_income'     => (float) $totalIncome,
            'total_expense'    => (float) $totalExpense,
            'current_balance'  => (float) $currentBalance,
        ];
    }
}
