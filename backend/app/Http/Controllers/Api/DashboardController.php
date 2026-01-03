<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\HouseholdService;
use App\Services\AccountService;
use App\Services\ProjectService;
use Illuminate\Support\Facades\Auth;

class DashboardController extends Controller
{
    public function __construct(
        private readonly HouseholdService $householdService,
        private readonly AccountService $accountService,
        private readonly ProjectService $projectService,
    ) {
    }

    public function __invoke()
    {
        $user = Auth::user();

        return response()->json([
            'household' => $this->householdService->getSummaryForUser($user),
            'accounts'  => $this->accountService->listWithBalancesForUser($user),
            'projects'  => $this->projectService->listWithSummaryForUser($user),
        ]);
    }
}
