<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Organization;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;

class OrganizationController extends Controller
{
    public function show()
    {
        $user = Auth::user();
        
        if (!$user->organization_id) {
            return response()->json(['message' => 'No organization found'], 404);
        }

        $organization = Organization::with('users')->find($user->organization_id);

        return response()->json($organization);
    }

    public function store(Request $request)
    {
        $user = Auth::user();

        if ($user->organization_id) {
            return response()->json(['message' => 'You already belong to an organization.'], 422);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
        ]);

        $organization = Organization::create([
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'owner_id' => $user->id,
        ]);

        $user->update(['organization_id' => $organization->id]);

        return response()->json($organization, 201);
    }

    public function update(Request $request)
    {
        $user = Auth::user();
        
        $organization = Organization::where('id', $user->organization_id)
            ->where('owner_id', $user->id)
            ->firstOrFail();

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
        ]);

        $organization->update($validated);

        return response()->json($organization);
    }

    public function destroy(int $id)
    {
        $user = Auth::user();
        $organization = Organization::where('id', $id)->where('owner_id', $user->id)->firstOrFail();

        $organization->users()->update(['organization_id' => null]);
        $organization->delete();

        return response()->json([], Response::HTTP_NO_CONTENT);
    }
}
