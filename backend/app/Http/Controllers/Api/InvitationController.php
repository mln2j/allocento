<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invitation;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Auth;

class InvitationController extends Controller
{
    /**
     * Invite a user to a household or organization.
     */
    public function invite(Request $request)
    {
        $user = Auth::user();
        $validated = $request->validate([
            'email' => ['required', 'email'],
            'entity_type' => ['required', 'in:household,organization'],
            'entity_id' => ['required', 'integer'],
        ]);

        // Check if inviter is the owner
        if ($validated['entity_type'] === 'household') {
            if ($user->household_id != $validated['entity_id']) {
                 return response()->json(['message' => 'Unauthorized'], 403);
            }
        } else {
            if ($user->organization_id != $validated['entity_id']) {
                 return response()->json(['message' => 'Unauthorized'], 403);
            }
        }

        $invitation = Invitation::create([
            'email' => $validated['email'],
            'entity_type' => $validated['entity_type'],
            'entity_id' => $validated['entity_id'],
            'token' => Str::random(40),
            'expires_at' => now()->addDays(7),
            'invited_by' => $user->id,
        ]);

        // In a real app, send email here. For now, we return the token/link.
        return response()->json([
            'message' => 'Invitation created.',
            'invitation' => $invitation,
            'invite_url' => url("/invitation/accept/{$invitation->token}")
        ]);
    }

    /**
     * Get pending invitations for the authenticated user.
     */
    public function pending(Request $request)
    {
        $invitations = Invitation::where('email', $request->user()->email)
            ->where(function ($query) {
                $query->whereNull('expires_at')
                      ->orWhere('expires_at', '>', now());
            })
            ->get();

        // Optional: Load entity names (Household/Organization)
        foreach ($invitations as $invitation) {
            if ($invitation->entity_type === 'household') {
                $invitation->entity_name = \App\Models\Household::find($invitation->entity_id)?->name;
            } else {
                $invitation->entity_name = \App\Models\Organization::find($invitation->entity_id)?->name;
            }
        }

        return response()->json($invitations);
    }

    /**
     * Reject an invitation.
     */
    public function reject(Request $request, $token)
    {
        $invitation = Invitation::where('token', $token)
            ->where('email', $request->user()->email)
            ->firstOrFail();

        $invitation->delete();

        return response()->json(['message' => 'Invitation rejected.']);
    }

    /**
     * Accept an invitation.
     */
    public function accept(Request $request, $token)
    {
        $user = Auth::user();
        $invitation = Invitation::where('token', $token)
            ->where('email', $user->email)
            ->firstOrFail();

        if ($invitation->expires_at && $invitation->expires_at->isPast()) {
            return response()->json(['message' => 'Invitation expired.'], 422);
        }

        if ($invitation->entity_type === 'household') {
            if ($user->household_id) {
                return response()->json(['message' => 'You already belong to a household.'], 422);
            }
            $user->update(['household_id' => $invitation->entity_id]);
        } else {
            if ($user->organization_id) {
                return response()->json(['message' => 'You already belong to an organization.'], 422);
            }
            $user->update(['organization_id' => $invitation->entity_id]);
        }

        $invitation->delete();

        return response()->json(['message' => "Successfully joined the {$invitation->entity_type}."]);
    }
}