<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Transaction;
use App\Models\Category;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    public function spendingByCategory(Request $request)
    {
        $user = Auth::user();

        $month = $request->query('month');
        if (! $month) {
            $month = now()->format('Y-m');
        }

        $start = Carbon::createFromFormat('Y-m', $month)->startOfMonth();
        $end   = (clone $start)->endOfMonth();

        $rows = Transaction::query()
            ->select('category_id', DB::raw('SUM(amount) as total_expense'))
            ->where('user_id', $user->id)
            ->where('type', 'expense')
            ->whereBetween('date', [$start, $end])
            ->groupBy('category_id')
            ->get();

        $categories = Category::whereIn('id', $rows->pluck('category_id')->filter())
            ->get()
            ->keyBy('id');

        $result = $rows->map(function ($row) use ($categories) {
            $category = $row->category_id ? $categories->get($row->category_id) : null;

            return [
                'category_id'   => $row->category_id,
                'category_name' => $category?->name ?? 'Uncategorized',
                'total_expense' => (float) $row->total_expense,
            ];
        })->values();

        return response()->json($result);
    }
}
