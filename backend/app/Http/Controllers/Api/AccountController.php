<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Account;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;

class AccountController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        $accounts = Account::query()
            ->where(function ($q) use ($user) {
                $q->where(function ($q) use ($user) {
                    $q->where('type', 'personal')
                        ->where('owner_user_id', $user->id);
                })
                    ->orWhere(function ($q) use ($user) {
                        $q->where('type', 'household')
                            ->where('household_id', $user->household_id);
                    })
                    ->orWhere(function ($q) use ($user) {
                        $q->where('type', 'organization')
                            ->where('organization_id', $user->organization_id);
                    });
            })
            ->orderBy('name')
            ->get();

        return response()->json($accounts);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name'    => ['required', 'string', 'max:255'],
            'type'    => ['required', 'in:personal,household,organization'],
            'currency'=> ['required', 'string', 'size:3'],
            'balance' => ['required', 'numeric'],
        ]);

        $user = $request->user();

        $data['owner_user_id']   = null;
        $data['household_id']    = null;
        $data['organization_id'] = null;

        if ($data['type'] === 'personal') {
            $data['owner_user_id'] = $user->id;
        } elseif ($data['type'] === 'household') {
            $data['household_id'] = $user->household_id;
        } elseif ($data['type'] === 'organization') {
            $data['organization_id'] = $user->organization_id;
        }

        $account = Account::create($data);

        return response()->json($account, 201);
    }

    public function show(Request $request, Account $account)
    {
        $user = $request->user();

        $authorized =
            ($account->type === 'personal' && $account->owner_user_id === $user->id) ||
            ($account->type === 'household' && $account->household_id === $user->household_id) ||
            ($account->type === 'organization' && $account->organization_id === $user->organization_id);

        if (! $authorized) {
            return response()->json([
                'message' => 'Forbidden',
                'error'   => 'You do not have access to this account.',
            ], 403);
        }

        return response()->json($account);
    }

    public function update(Request $request, int $id)
    {
        $user = Auth::user();

        $account = Account::findOrFail($id);

        $authorized =
            ($account->type === 'personal' && $account->owner_user_id === $user->id) ||
            ($account->type === 'household' && $account->household_id === $user->household_id) ||
            ($account->type === 'organization' && $account->organization_id === $user->organization_id);

        if (! $authorized) {
            return response()->json([
                'message' => 'Forbidden',
                'error'   => 'You do not have access to this account.',
            ], 403);
        }

        $data = $request->validate([
            'name'     => ['sometimes', 'string', 'max:255'],
            'type'     => ['sometimes', 'in:personal,household,organization'],
            'currency' => ['sometimes', 'string', 'size:3'],
            'balance'  => ['sometimes', 'numeric'],
        ]);

        if (array_key_exists('type', $data)) {
            $data['owner_user_id']   = null;
            $data['household_id']    = null;
            $data['organization_id'] = null;

            if ($data['type'] === 'personal') {
                $data['owner_user_id'] = $user->id;
            } elseif ($data['type'] === 'household') {
                $data['household_id'] = $user->household_id;
            } elseif ($data['type'] === 'organization') {
                $data['organization_id'] = $user->organization_id;
            }
        }

        $account->update($data);

        return response()->json($account);
    }

    public function destroy(int $id)
    {
        $user = Auth::user();

        $account = Account::findOrFail($id);

        $authorized =
            ($account->type === 'personal' && $account->owner_user_id === $user->id) ||
            ($account->type === 'household' && $account->household_id === $user->household_id) ||
            ($account->type === 'organization' && $account->organization_id === $user->organization_id);

        if (! $authorized) {
            return response()->json([
                'message' => 'Forbidden',
                'error'   => 'You do not have access to this account.',
            ], 403);
        }

        $account->delete();

        return response()->json([], Response::HTTP_NO_CONTENT);
    }
}
