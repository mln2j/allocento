<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Models\Account;
use App\Models\Transaction;

class DashboardController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $workspace = $request->get('_workspace');
        if (!$workspace) {
            return response()->json(['error' => 'Workspace context not resolved.'], 400);
        }

        // 1. Get Accounts in workspace
        $accounts = $workspace->accounts()->get();

        // 2. Calculate Totals
        $workspaceTotal = (float)$accounts->sum('balance');

        // 3. Primary Account (Check is_primary first, then fallback to highest balance)
        $primaryAccount = $accounts->where('is_primary', true)->first()
            ?? $accounts->sortByDesc('balance')->first();

        // 4. Recent Transactions (Limit 10)
        $accountIds = $accounts->pluck('id');
        $recentTransactions = Transaction::whereIn('account_id', $accountIds)
            ->with(['account', 'category', 'createdBy'])
            ->orderBy('date', 'desc')
            ->limit(10)
            ->get();

        // 5. Spending by Category (Last 30 days)
        $spendingByCategory = Transaction::whereIn('account_id', $accountIds)
            ->where('type', 'expense')
            ->where('date', '>=', now()->subDays(30))
            ->selectRaw('category_id, sum(amount) as total')
            ->groupBy('category_id')
            ->with('category')
            ->get()
            ->map(function ($item) {
                return [
                    'name' => $item->category?->name ?? 'Uncategorized',
                    'amount' => (float)$item->total,
                    'color' => $item->category?->color ?? ('#' . substr(md5($item->category?->name ?? 'default'), 0, 6)),
                ];
            });

        return response()->json([
            'workspace' => $workspace,
            'summary' => [
                'total_balance' => $workspaceTotal,
                'primary_account' => $primaryAccount,
            ],
            'accounts' => $accounts,
            'recent_transactions' => $recentTransactions,
            'spending_stats' => $spendingByCategory,
        ]);
    }
}