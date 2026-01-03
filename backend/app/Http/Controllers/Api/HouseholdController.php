<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Household;
use App\Services\HouseholdService;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;

class HouseholdController extends Controller
{
    public function __construct(
        private readonly HouseholdService $householdService
    ) {
    }

    public function summary()
    {
        $user = Auth::user();

        $summary = $this->householdService->getSummaryForUser($user);

        if (! $summary) {
            return response()->json(
                ['message' => 'User has no household'],
                Response::HTTP_NOT_FOUND
            );
        }

        return response()->json($summary);
    }

    public function destroy(int $id)
    {
        $user = Auth::user();

        $household = Household::query()
            ->where('id', $id)
            ->where('id', $user->household_id)
            ->firstOrFail();

        $household->delete(); // soft delete

        return response()->json([], Response::HTTP_NO_CONTENT);
    }
}
