<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Services\AccountService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;

class AccountController extends Controller
{
    public function __construct(
        private readonly AccountService $accountService
    ) {

    }

    public function index()
    {
        $user = Auth::user();

        $accounts = $this->accountService->listForUser($user);

        return response()->json($accounts);
    }

    public function store(Request $request)
    {
        $user = Auth::user();

        $data = $request->validate([
            'name'            => ['required', 'string', 'max:255'],
            'type'            => ['required', 'in:personal,household,organization'],
            'currency'        => ['nullable', 'string', 'size:3'],
            'opening_balance' => ['nullable', 'numeric'],
            'budget_limit'    => ['nullable', 'numeric'],
            'household_id'    => ['nullable', 'integer'],
            'organization_id' => ['nullable', 'integer'],
        ]);

        $account = $this->accountService->createForUser($user, $data);

        return response()->json($account, Response::HTTP_CREATED);
    }

    public function show(Account $account)
    {
        return response()->json($account);
    }
}
