<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Transaction;
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
            'category_id' => ['nullable', 'exists:categories,id'],
            'project_id'  => ['nullable', 'exists:projects,id'],
        ]);

        $transaction = $this->transactionService->createForAccount($user, $accountId, $data);

        return response()->json($transaction, Response::HTTP_CREATED);
    }

    public function update(Request $request, int $accountId, int $transactionId)
    {
        $user = Auth::user();

        $data = $request->validate([
            'type'        => ['sometimes', 'in:income,expense'],
            'amount'      => ['sometimes', 'numeric'],
            'date'        => ['sometimes', 'date'],
            'description' => ['sometimes', 'nullable', 'string'],
            'category_id' => ['sometimes', 'nullable', 'exists:categories,id'],
            'project_id'  => ['sometimes', 'nullable', 'exists:projects,id'],
        ]);

        $transaction = $this->transactionService->updateForAccount(
            $user,
            $accountId,
            $transactionId,
            $data
        );

        return response()->json($transaction);
    }

    public function show(Request $request, Transaction $transaction)
    {
        $user = $request->user();

        if ($transaction->user_id !== $user->id) {
            return response()->json([
                'message' => 'Forbidden',
                'error' => 'You do not have access to this transaction.',
            ], 403);
        }

        return response()->json($transaction);
    }

    public function destroy(int $accountId, int $transactionId)
    {
        $user = Auth::user();

        $this->transactionService->deleteForAccount($user, $accountId, $transactionId);

        return response()->json([], Response::HTTP_NO_CONTENT);
    }
}
