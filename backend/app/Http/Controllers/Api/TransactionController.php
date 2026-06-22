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

    public function sync(Request $request): JsonResponse
    {
        $workspace = $request->get('_workspace');
        $accountIds = $workspace->accounts()->pluck('accounts.id')->toArray();

        $data = $request->validate([
            'operations' => ['required', 'array', 'max:500'],
            'operations.*.action' => ['required', 'in:create,update,delete'],
            'operations.*.transaction_id' => ['nullable', 'integer'],
            'operations.*.payload' => ['nullable', 'array'],
        ]);

        $results = DB::transaction(function () use ($data, $request, $accountIds) {
            $syncedCount = 0;
            $errors = [];
            $idMappings = []; // Maps local negative IDs to real database IDs

            foreach ($data['operations'] as $index => $operation) {
                $action = $operation['action'];
                $payload = $operation['payload'] ?? [];
                
                // For updates and deletes
                $transactionId = $operation['transaction_id'] ?? null;
                
                // If it's an update or delete, but the transactionId is negative (created offline),
                // we should map it to the real ID that was generated during the 'create' operation in this sync batch.
                if (in_array($action, ['update', 'delete']) && $transactionId < 0 && isset($idMappings[$transactionId])) {
                    $transactionId = $idMappings[$transactionId];
                }

                try {
                    if ($action === 'create') {
                        $accountId = $payload['account_id'] ?? null;
                        if (!$accountId || !in_array($accountId, $accountIds)) {
                            throw new \Exception('Account not found or access denied in active workspace.');
                        }

                        $tx = $this->transactionService->createForAccount($request->user(), $accountId, $payload);
                        
                        // If the frontend provided a negative local ID in the payload (e.g. local_id), map it
                        if (isset($payload['local_id']) && $payload['local_id'] < 0) {
                            $idMappings[$payload['local_id']] = $tx->id;
                        }
                        $syncedCount++;

                    } elseif ($action === 'update') {
                        // First find the transaction to ensure we have access
                        $transaction = Transaction::where('id', $transactionId)->whereIn('account_id', $accountIds)->first();
                        if (!$transaction) {
                            throw new \Exception('Transaction not found or access denied.');
                        }

                        // Allow moving between accounts if account_id is provided
                        $accountId = $payload['account_id'] ?? $transaction->account_id;
                        if (!in_array($accountId, $accountIds)) {
                            throw new \Exception('Target account not found or access denied.');
                        }

                        $this->transactionService->updateForAccount($request->user(), $accountId, $transactionId, $payload);
                        $syncedCount++;

                    } elseif ($action === 'delete') {
                        $transaction = Transaction::where('id', $transactionId)->whereIn('account_id', $accountIds)->first();
                        if (!$transaction) {
                            // If it's already deleted or not found, we can just skip or count as success
                            continue;
                        }

                        $this->transactionService->deleteForAccount($request->user(), $transaction->account_id, $transactionId);
                        $syncedCount++;
                    }
                } catch (\Exception $e) {
                    $errors[] = [
                        'index' => $index,
                        'action' => $action,
                        'transaction_id' => $transactionId ?? ($payload['local_id'] ?? null),
                        'error' => $e->getMessage()
                    ];
                }
            }
            return ['synced' => $syncedCount, 'errors' => $errors, 'id_mappings' => $idMappings];
        });

        return response()->json($results, count($results['errors']) > 0 ? 207 : 200); // 207 Multi-Status if there are errors
    }
}
