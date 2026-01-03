<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\TransactionService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;

class TransactionController extends Controller
{
    public function __construct(
        private readonly TransactionService $transactionService
    ) {

    }

    public function index(int $accountId)
    {
        $user = Auth::user();

        $transactions = $this->transactionService->listForAccount($user, $accountId);

        return response()->json($transactions);
    }

    public function store(Request $request, int $accountId)
    {
        $user = Auth::user();

        $data = $request->validate([
            'type'        => ['required', 'in:income,expense'],
            'amount'      => ['required', 'numeric'],
            'date'        => ['required', 'date'],
            'description' => ['nullable', 'string'],
            'category_id' => ['nullable', 'integer'],
            'project_id'  => ['nullable', 'integer'],
        ]);

        $transaction = $this->transactionService->createForAccount($user, $accountId, $data);

        return response()->json($transaction, Response::HTTP_CREATED);
    }
}
