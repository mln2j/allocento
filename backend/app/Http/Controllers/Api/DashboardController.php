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
            ->with(['account', 'category', 'project', 'createdBy'])
            ->orderBy('date', 'desc')
            ->limit(5)
            ->get();

        // 5. Spending by Category (Last 30 days)
        $spendingByCategory = Transaction::whereIn('account_id', $accountIds)
            ->where('type', 'expense')
            ->where('exclude_from_analytics', false)
            ->where('date', '>=', now()->subDays(30))
            ->selectRaw('category_id, sum(amount) as total')
            ->groupBy('category_id')
            ->with('category')
            ->get()
            ->map(function ($item) {
                return [
                    'id' => $item->category_id,
                    'name' => $item->category?->name ?? 'Uncategorized',
                    'amount' => (float)$item->total,
                    'color' => $item->category?->color ?? ('#' . substr(md5($item->category?->name ?? 'default'), 0, 6)),
                ];
            });

        // 5.5 Spending by Project (Last 30 days)
        $spendingByProject = Transaction::whereIn('account_id', $accountIds)
            ->where('type', 'expense')
            ->where('exclude_from_analytics', false)
            ->where('date', '>=', now()->subDays(30))
            ->selectRaw('project_id, sum(amount) as total')
            ->groupBy('project_id')
            ->with('project')
            ->get()
            ->map(function ($item) {
                return [
                    'id' => $item->project_id,
                    'name' => $item->project?->name ?? 'Unprojected',
                    'amount' => (float)$item->total,
                    'color' => $item->project?->color ?? ('#' . substr(md5($item->project?->name ?? 'default'), 0, 6)),
                ];
            });

        // 6. Daily spending for the last 7 days
        $dailySpending = [];
        for ($i = 6; $i >= 0; $i--) {
            $date = now()->subDays($i);
            $dateString = $date->toDateString();
            $total = Transaction::whereIn('account_id', $accountIds)
                ->where('type', 'expense')
                ->where('exclude_from_analytics', false)
                ->whereDate('date', $dateString)
                ->sum('amount');
            $dailySpending[] = [
                'date' => $dateString,
                'day_name' => $date->format('D'), // e.g. Mon, Tue...
                'amount' => (float)$total,
            ];
        }

        return response()->json([
            'workspace' => $workspace,
            'summary' => [
                'total_balance' => $workspaceTotal,
                'primary_account' => $primaryAccount,
            ],
            'accounts' => $accounts,
            'recent_transactions' => $recentTransactions,
            'spending_stats' => $spendingByCategory,
            'spending_by_project' => $spendingByProject,
            'daily_spending' => $dailySpending,
        ]);
    }
}