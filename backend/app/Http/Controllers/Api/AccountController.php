<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Account;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class AccountController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $workspace = $request->get('_workspace');
        $accounts = $workspace->accounts()->orderBy('name')->get();
        return response()->json($accounts);
    }

    public function store(Request $request): JsonResponse
    {
        $workspace = $request->get('_workspace');

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', 'in:checking,savings,cash,credit,investment,other'],
            'currency' => ['required', 'string', 'size:3'],
            'balance' => ['required', 'numeric'],
            'opening_balance' => ['nullable', 'numeric'],
            'is_primary' => ['nullable', 'boolean'],
        ]);

        $account = DB::transaction(function () use ($validated, $workspace, $request) {
            $balance = $validated['balance'];
            $openingBalance = $validated['opening_balance'] ?? $balance;

            $account = Account::create([
                'name' => $validated['name'],
                'type' => $validated['type'],
                'created_by_user_id' => $request->user()->id,
                'currency' => $validated['currency'],
                'balance' => $balance,
                'opening_balance' => $openingBalance,
                'is_primary' => $validated['is_primary'] ?? false,
            ]);

            // Sync account with the active workspace
            $workspace->accounts()->attach($account->id);

            // If set as primary, unmark other accounts in this workspace
            if ($account->is_primary) {
                $workspace->accounts()
                    ->where('accounts.id', '!=', $account->id)
                    ->update(['is_primary' => false]);
            }

            return $account;
        });

        return response()->json($account, 201);
    }

    public function show(Request $request, $id): JsonResponse
    {
        $workspace = $request->get('_workspace');
        $account = $workspace->accounts()->where('accounts.id', $id)->first();

        if (!$account) {
            return response()->json([
                'message' => 'Forbidden',
                'error' => 'You do not have access to this account within the active workspace.',
            ], 403);
        }

        return response()->json($account);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $workspace = $request->get('_workspace');
        $account = $workspace->accounts()->where('accounts.id', $id)->first();

        if (!$account) {
            return response()->json([
                'message' => 'Forbidden',
                'error' => 'You do not have access to this account within the active workspace.',
            ], 403);
        }

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'type' => ['sometimes', 'required', 'in:checking,savings,cash,credit,investment,other'],
            'currency' => ['sometimes', 'required', 'string', 'size:3'],
            'balance' => ['sometimes', 'required', 'numeric'],
            'is_primary' => ['sometimes', 'required', 'boolean'],
            'is_archived' => ['sometimes', 'required', 'boolean'],
        ]);

        DB::transaction(function () use ($account, $validated, $workspace) {
            $account->update($validated);

            if (isset($validated['is_primary']) && $validated['is_primary']) {
                $workspace->accounts()
                    ->where('accounts.id', '!=', $account->id)
                    ->update(['is_primary' => false]);
            }
        });

        return response()->json($account);
    }

    public function destroy(Request $request, $id): JsonResponse
    {
        $workspace = $request->get('_workspace');
        $account = $workspace->accounts()->where('accounts.id', $id)->first();

        if (!$account) {
            return response()->json([
                'message' => 'Forbidden',
                'error' => 'You do not have access to this account within the active workspace.',
            ], 403);
        }

        $account->delete();

        return response()->json(null, Response::HTTP_NO_CONTENT);
    }

    public function setPrimary(Request $request, $id): JsonResponse
    {
        $workspace = $request->get('_workspace');
        $account = $workspace->accounts()->where('accounts.id', $id)->first();

        if (!$account) {
            return response()->json([
                'message' => 'Forbidden',
                'error' => 'You do not have access to this account within the active workspace.',
            ], 403);
        }

        DB::transaction(function () use ($workspace, $account) {
            // Remove primary status from all other accounts in active workspace
            $workspace->accounts()->update(['is_primary' => false]);
            // Set this one as primary
            $account->update(['is_primary' => true]);
        });

        return response()->json(['message' => 'Account set as primary in workspace.']);
    }
}
