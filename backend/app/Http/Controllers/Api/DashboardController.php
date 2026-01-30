<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Auth;
use App\Models\Account;
use App\Models\Transaction;

class DashboardController extends Controller
{
    public function __invoke()
    {
        $user = Auth::user();

        // 1. Get Accounts (using stored 'balance' column as requested)
        $personalAccounts = Account::where('owner_user_id', $user->id)->get();
        $householdAccounts = $user->household_id 
            ? Account::where('household_id', $user->household_id)->get() 
            : collect();

        // 2. Calculate Totals
        // Personal total = all accounts owned by user
        $personalTotal = (float)$personalAccounts->sum('balance');
        
        // Household total = all accounts in the household
        $householdTotal = (float)$householdAccounts->sum('balance');

        // 3. Primary Account (Check is_primary first, then fallback to highest balance)
        $primaryAccount = $personalAccounts->where('is_primary', true)->first() 
            ?? $personalAccounts->sortByDesc('balance')->first();

        // 4. Combined Unique Accounts for display
        $allAccounts = $personalAccounts->concat($householdAccounts)->unique('id')->values();

        // 5. Recent Transactions (Limit 10)
        $recentTransactions = Transaction::whereHas('account', function($query) use ($user) {
                $query->where('owner_user_id', $user->id)
                      ->orWhere('household_id', $user->household_id);
            })
            ->with(['account', 'category'])
            ->orderBy('date', 'desc')
            ->limit(10)
            ->get();

        // 6. Spending by Category (Last 30 days)
        $spendingByCategory = Transaction::whereHas('account', function($query) use ($user) {
                $query->where('owner_user_id', $user->id)
                      ->orWhere('household_id', $user->household_id);
            })
            ->where('type', 'expense')
            ->where('date', '>=', now()->subDays(30))
            ->selectRaw('category_id, sum(amount) as total')
            ->groupBy('category_id')
            ->with('category')
            ->get()
            ->map(function($item) {
                return [
                    'name' => $item->category?->name ?? 'Uncategorized',
                    'amount' => (float)$item->total,
                    'color' => '#' . substr(md5($item->category?->name ?? 'default'), 0, 6)
                ];
            });

        return response()->json([
            'summary' => [
                'personal_total' => $personalTotal,
                'household_total' => $householdTotal,
                'primary_account' => $primaryAccount,
            ],
            'accounts' => $allAccounts,
            'recent_transactions' => $recentTransactions,
            'spending_stats' => $spendingByCategory
        ]);
    }
}