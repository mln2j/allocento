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
        // Include owningWorkspace, its users, and createdBy to determine management permissions easily and show the owner
        $accounts = $workspace->accounts()->with(['workspaces', 'owningWorkspace.users', 'createdBy'])->get();
        
        $accounts = $accounts->sortBy([
            function ($account) {
                return $account->owningWorkspace?->type === 'personal' ? 0 : 1;
            },
            ['name', 'asc']
        ])->values();

        $accounts = $accounts->map(function ($account) use ($request) {
            $owningWorkspace = $account->owningWorkspace;
            $canManage = true;

            if ($owningWorkspace) {
                $user = $owningWorkspace->users->where('id', $request->user()->id)->first();
                $userRole = $user ? $user->pivot->role : null;
                
                if ($owningWorkspace->type === 'personal') {
                    $canManage = ($userRole === 'owner');
                } else {
                    $canManage = in_array($userRole, ['owner', 'manager']);
                }
            }
            
            $arr = $account->toArray();
            $arr['can_manage'] = $canManage;
            
            if (isset($arr['owning_workspace'])) {
                unset($arr['owning_workspace']['users']);
            }
            
            return $arr;
        });

        return response()->json($accounts);
    }

    public function allUserAccounts(Request $request): JsonResponse
    {
        $user = $request->user();
        
        $workspaces = $user->workspaces()->get();
        $workspaceIds = $workspaces->filter(function ($ws) {
            if ($ws->type === 'personal') return true;
            $role = $ws->pivot->role;
            return in_array($role, ['owner', 'manager']);
        })->pluck('id');

        $accounts = \App\Models\Account::with(['workspaces', 'owningWorkspace.users', 'createdBy'])
            ->whereIn('workspace_id', $workspaceIds)
            ->get();
            
        $accounts = $accounts->sortBy([
            function ($account) {
                return $account->owningWorkspace?->type === 'personal' ? 0 : 1;
            },
            ['name', 'asc']
        ])->values();
            
        $accounts = $accounts->map(function ($account) {
            $canManage = true; // They can manage because we filtered by owner/manager/personal
            
            $arr = $account->toArray();
            $arr['can_manage'] = $canManage;
            
            if (isset($arr['owning_workspace'])) {
                unset($arr['owning_workspace']['users']);
            }
            
            return $arr;
        });

        return response()->json($accounts);
    }

    public function store(Request $request): JsonResponse
    {
        $workspace = $request->get('_workspace');

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', 'in:checking,savings,cash,credit,investment,other,bank'],
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
                'workspace_id' => $workspace->id,
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

        return response()->json($account->load('workspaces'), 201);
    }

    public function show(Request $request, $id): JsonResponse
    {
        $workspace = $request->get('_workspace');
        $account = $workspace->accounts()->where('accounts.id', $id)->first();

        if (!$account) {
            return response()->json([
                'message' => 'error.forbiddenAccess',
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
                'message' => 'error.forbiddenAccess',
                'error' => 'You do not have access to this account within the active workspace.',
            ], 403);
        }

        // Check ownership/permissions
        $owningWorkspace = $account->owningWorkspace;
        if ($owningWorkspace) {
            $userRole = $owningWorkspace->users()->where('users.id', $request->user()->id)->first()?->pivot->role;
            if ($owningWorkspace->type === 'personal') {
                if ($userRole !== 'owner') {
                    return response()->json([
                        'message' => 'error.forbiddenPersonal',
                        'error' => 'Only the owner of the personal workspace can edit this account.',
                    ], 403);
                }
            } else {
                if ($userRole !== 'owner' && $userRole !== 'manager') {
                    return response()->json([
                        'message' => 'error.forbiddenWorkspace',
                        'error' => 'Only the owner or manager of the workspace can edit this account.',
                    ], 403);
                }
            }
        }

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'type' => ['sometimes', 'required', 'in:checking,savings,cash,credit,investment,other,bank'],
            'currency' => ['sometimes', 'required', 'string', 'size:3'],
            'balance' => ['sometimes', 'required', 'numeric'],
            'is_primary' => ['sometimes', 'required', 'boolean'],
            'is_archived' => ['sometimes', 'required', 'boolean'],
        ]);

        DB::transaction(function () use ($account, $validated, $workspace, $request) {
            $newBalance = $validated['balance'] ?? $account->balance;
            unset($validated['balance']);
            
            $account->update($validated);

            if (round($newBalance, 2) != round($account->balance, 2)) {
                $diff = $newBalance - $account->balance;
                
                app(\App\Services\TransactionService::class)->createForAccount(
                    $request->user(),
                    $account->id,
                    [
                        'type' => $diff > 0 ? 'income' : 'expense',
                        'amount' => abs($diff),
                        'date' => now()->toDateTimeString(),
                        'description' => 'balance_correction',
                    ]
                );
            }

            if (isset($validated['is_primary']) && $validated['is_primary']) {
                $workspace->accounts()
                    ->where('accounts.id', '!=', $account->id)
                    ->update(['is_primary' => false]);
            }
        });

        return response()->json($account->load('workspaces'));
    }

    public function destroy(Request $request, $id): JsonResponse
    {
        $workspace = $request->get('_workspace');
        $account = $workspace->accounts()->where('accounts.id', $id)->first();

        if (!$account) {
            return response()->json([
                'message' => 'error.forbiddenAccess',
                'error' => 'You do not have access to this account within the active workspace.',
            ], 403);
        }

        // Check ownership/permissions
        $owningWorkspace = $account->owningWorkspace;
        if ($owningWorkspace) {
            $userRole = $owningWorkspace->users()->where('users.id', $request->user()->id)->first()?->pivot->role;
            if ($owningWorkspace->type === 'personal') {
                if ($userRole !== 'owner') {
                    return response()->json([
                        'message' => 'error.forbiddenPersonal',
                        'error' => 'Only the owner of the personal workspace can delete this account.',
                    ], 403);
                }
            } else {
                if ($userRole !== 'owner' && $userRole !== 'manager') {
                    return response()->json([
                        'message' => 'error.forbiddenWorkspace',
                        'error' => 'Only the owner or manager of the workspace can delete this account.',
                    ], 403);
                }
            }
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
                'message' => 'error.forbiddenAccess',
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
