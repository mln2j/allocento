<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Household;
use App\Services\HouseholdService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;

class HouseholdController extends Controller
{
    public function __construct(
        private readonly HouseholdService $householdService
    ) {
    }

    public function show()
    {
        $user = Auth::user();

        if (!$user->household_id) {
            return response()->json(['message' => 'No household found'], 404);
        }

        $household = Household::with('users')->find($user->household_id);

        return response()->json($household);
    }

    public function store(Request $request)
    {
        $user = Auth::user();

        if ($user->household_id) {
            return response()->json(['message' => 'You already belong to a household.'], 422);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        $household = Household::create([
            'name' => $validated['name'],
            'owner_id' => $user->id,
        ]);

        $user->update(['household_id' => $household->id]);

        return response()->json($household, 201);
    }

    public function update(Request $request)
    {
        $user = Auth::user();
        
        $household = Household::where('id', $user->household_id)
            ->where('owner_id', $user->id)
            ->firstOrFail();

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        $household->update($validated);

        return response()->json($household);
    }

    public function summary()
    {
        $user = Auth::user();
        $summary = $this->householdService->getSummaryForUser($user);

        if (! $summary) {
            return response()->json(['message' => 'User has no household'], 404);
        }

        return response()->json($summary);
    }

    public function destroy(int $id)
    {
        $user = Auth::user();
        $household = Household::where('id', $id)->where('owner_id', $user->id)->firstOrFail();

        $household->users()->update(['household_id' => null]);
        $household->delete();

        return response()->json([], Response::HTTP_NO_CONTENT);
    }
}
