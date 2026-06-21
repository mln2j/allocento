<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Transaction;
use App\Models\Account;
use App\Services\TransactionService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class TransactionController extends Controller
{
    public function __construct(
        private readonly TransactionService $transactionService
    ) {
    }

    public function all(Request $request): JsonResponse
    {
        $workspace = $request->get('_workspace');
        $accountIds = $workspace->accounts()->pluck('accounts.id');

        $query = Transaction::whereIn('account_id', $accountIds)
            ->with(['account', 'category', 'createdBy'])
            ->orderBy('date', 'desc');

        // Optional tag filtering
        if ($request->filled('tag')) {
            $query->whereJsonContains('tags', $request->input('tag'));
        }

        if ($request->filled('tags')) {
            $tags = (array) $request->input('tags');
            foreach ($tags as $tag) {
                $query->whereJsonContains('tags', $tag);
            }
        }

        $transactions = $query->paginate(20);

        return response()->json($transactions);
    }

    public function index(Request $request, int $accountId): JsonResponse
    {
        $workspace = $request->get('_workspace');
        $account = $workspace->accounts()->where('accounts.id', $accountId)->first();

        if (!$account) {
            return response()->json(['error' => 'Account not found or access denied in active workspace.'], 403);
        }

        $transactions = $this->transactionService->listForAccount($request->user(), $accountId);

        return response()->json($transactions);
    }

    public function store(Request $request, int $accountId): JsonResponse
    {
        $workspace = $request->get('_workspace');
        $account = $workspace->accounts()->where('accounts.id', $accountId)->first();

        if (!$account) {
            return response()->json(['error' => 'Account not found or access denied in active workspace.'], 403);
        }

        $data = $request->validate([
            'type' => ['required', 'in:income,expense'],
            'amount' => ['required', 'numeric'],
            'date' => ['required', 'date'],
            'description' => ['nullable', 'string'],
            'category_id' => ['nullable', 'exists:categories,id'],
            'project_id' => ['nullable', 'exists:projects,id'],
            'tags' => ['nullable', 'array'],
        ]);

        $transaction = $this->transactionService->createForAccount($request->user(), $accountId, $data);

        return response()->json($transaction, Response::HTTP_CREATED);
    }

    public function show(Request $request, $id): JsonResponse
    {
        $workspace = $request->get('_workspace');
        $accountIds = $workspace->accounts()->pluck('accounts.id');

        $transaction = Transaction::whereIn('account_id', $accountIds)
            ->where('id', $id)
            ->first();

        if (!$transaction) {
            return response()->json([
                'message' => 'Forbidden',
                'error' => 'You do not have access to this transaction in the active workspace.',
            ], 403);
        }

        return response()->json($transaction);
    }

    public function update(Request $request, int $accountId, int $transactionId): JsonResponse
    {
        $workspace = $request->get('_workspace');
        $account = $workspace->accounts()->where('accounts.id', $accountId)->first();

        if (!$account) {
            return response()->json(['error' => 'Account not found or access denied in active workspace.'], 403);
        }

        $data = $request->validate([
            'type' => ['sometimes', 'required', 'in:income,expense'],
            'amount' => ['sometimes', 'required', 'numeric'],
            'date' => ['sometimes', 'required', 'date'],
            'description' => ['sometimes', 'nullable', 'string'],
            'category_id' => ['sometimes', 'nullable', 'exists:categories,id'],
            'project_id' => ['sometimes', 'nullable', 'exists:projects,id'],
            'tags' => ['sometimes', 'nullable', 'array'],
        ]);

        $transaction = $this->transactionService->updateForAccount(
            $request->user(),
            $accountId,
            $transactionId,
            $data
        );

        return response()->json($transaction);
    }

    public function destroy(Request $request, int $accountId, int $transactionId): JsonResponse
    {
        $workspace = $request->get('_workspace');
        $account = $workspace->accounts()->where('accounts.id', $accountId)->first();

        if (!$account) {
            return response()->json(['error' => 'Account not found or access denied in active workspace.'], 403);
        }

        $this->transactionService->deleteForAccount($request->user(), $accountId, $transactionId);

        return response()->json(null, Response::HTTP_NO_CONTENT);
    }

    public function bulk(Request $request): JsonResponse
    {
        $workspace = $request->get('_workspace');
        $accountIds = $workspace->accounts()->pluck('accounts.id')->toArray();

        $data = $request->validate([
            'transactions' => ['required', 'array', 'max:500'],
            'transactions.*.account_id' => ['required', 'integer'],
            'transactions.*.type' => ['required', 'in:income,expense'],
            'transactions.*.amount' => ['required', 'numeric'],
            'transactions.*.date' => ['required', 'date'],
            'transactions.*.description' => ['nullable', 'string'],
            'transactions.*.category_id' => ['nullable', 'integer', 'exists:categories,id'],
            'transactions.*.project_id' => ['nullable', 'integer', 'exists:projects,id'],
            'transactions.*.tags' => ['nullable', 'array'],
        ]);

        // Validate all account IDs belong to the active workspace
        foreach ($data['transactions'] as $t) {
            if (!in_array($t['account_id'], $accountIds)) {
                return response()->json(['error' => 'One or more account IDs do not belong to the active workspace.'], 403);
            }
        }

        $createdCount = DB::transaction(function () use ($data, $request) {
            $count = 0;
            foreach ($data['transactions'] as $tData) {
                $accountId = $tData['account_id'];
                
                // Construct single transaction payload
                $payload = [
                    'type' => $tData['type'],
                    'amount' => $tData['amount'],
                    'date' => $tData['date'],
                    'description' => $tData['description'] ?? null,
                    'category_id' => $tData['category_id'] ?? null,
                    'project_id'  => $tData['project_id'] ?? null,
                    'tags' => $tData['tags'] ?? null,
                ];

                $this->transactionService->createForAccount($request->user(), $accountId, $payload);
                $count++;
            }
            return $count;
        });

        return response()->json(['synced' => $createdCount], 201);
    }
}
