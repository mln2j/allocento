<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Hash;
use App\Models\Household;
use App\Models\Organization;

class ProfileController extends Controller
{
    /**
     * Update the user's profile information.
     */
    public function update(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users')->ignore($user->id)],
        ]);

        $user->update($validated);

        return response()->json([
            'message' => 'Profile updated successfully.',
            'user' => $user,
        ]);
    }

    /**
     * Change the user's password.
     */
    public function changePassword(Request $request)
    {
        $validated = $request->validate([
            'current_password' => ['required', 'current_password'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $request->user()->update([
            'password' => Hash::make($validated['password']),
        ]);

        return response()->json([
            'message' => 'Password changed successfully.',
        ]);
    }

    /**
     * Update the user's profile photo.
     */
    public function uploadPhoto(Request $request)
    {
        $request->validate([
            'photo' => ['required', 'image', 'max:1024'], // 1MB Max
        ]);

        $user = $request->user();

        if ($request->file('photo')) {
            // Delete old photo if exists
            if ($user->profile_photo_path) {
                Storage::disk('public')->delete($user->profile_photo_path);
            }

            $path = $request->file('photo')->store('profile-photos', 'public');

            $user->update([
                'profile_photo_path' => $path,
            ]);
        }

        return response()->json([
            'message' => 'Profile photo updated.',
            'profile_photo_url' => $user->profile_photo_url,
        ]);
    }

    /**
     * Delete the user's profile photo.
     */
    public function deletePhoto(Request $request)
    {
        $user = $request->user();

        if ($user->profile_photo_path) {
            Storage::disk('public')->delete($user->profile_photo_path);
            $user->update(['profile_photo_path' => null]);
        }

        return response()->json([
            'message' => 'Profile photo deleted.',
            'profile_photo_url' => $user->profile_photo_url,
        ]);
    }

    /**
     * Delete the user account.
     */
    public function destroy(Request $request)
    {
        $user = $request->user();

        // Check ownership
        if (Household::where('owner_id', $user->id)->exists()) {
            return response()->json([
                'message' => 'Cannot delete account. You are the owner of a household. Please transfer ownership or delete the household first.'
            ], 403);
        }

        if (Organization::where('owner_id', $user->id)->exists()) {
            return response()->json([
                'message' => 'Cannot delete account. You are the owner of an organization. Please transfer ownership or delete the organization first.'
            ], 403);
        }

        // Delete personal accounts
        $user->accounts()->where('type', 'personal')->delete();

        // Soft delete user (revokes tokens automatically via Sanctum usually, but let's be sure)
        $user->tokens()->delete();
        $user->delete();

        return response()->json([
            'message' => 'Account deleted successfully.',
        ]);
    }
}