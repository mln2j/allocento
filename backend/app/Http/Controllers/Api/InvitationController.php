<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invitation;
use App\Models\Workspace;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\JsonResponse;

class InvitationController extends Controller
{
    /**
     * Invite a user to a workspace.
     */
    public function invite(Request $request): JsonResponse
    {
        $user = $request->user();
        $workspace = $request->get('_workspace');

        // Check if inviter has manager or owner role
        $memberRole = $workspace->users()->where('users.id', $user->id)->first()?->pivot->role;
        if (!in_array($memberRole, ['owner', 'manager'])) {
            return response()->json(['message' => 'Unauthorized to invite users to this workspace.'], 403);
        }

        $validated = $request->validate([
            'email' => ['required', 'email'],
            'role' => ['sometimes', 'required', 'in:manager,member'],
        ]);

        $role = $validated['role'] ?? 'member';

        // Check if user is already a member
        $isMember = $workspace->users()->where('email', $validated['email'])->exists();
        if ($isMember) {
            return response()->json(['message' => 'User is already a member of this workspace.'], 422);
        }

        // Check if pending invitation already exists
        $pendingInvitation = Invitation::where('workspace_id', $workspace->id)
            ->where('email', $validated['email'])
            ->where(function ($query) {
                $query->whereNull('expires_at')
                      ->orWhere('expires_at', '>', now());
            })
            ->first();

        if ($pendingInvitation) {
            return response()->json([
                'message' => 'Pending invitation already exists for this email.',
                'invitation' => $pendingInvitation
            ], 422);
        }

        $invitation = Invitation::create([
            'workspace_id' => $workspace->id,
            'email' => $validated['email'],
            'role' => $role,
            'token' => Str::random(40),
            'expires_at' => now()->addDays(7),
        ]);

        return response()->json([
            'message' => 'Invitation created successfully.',
            'invitation' => $invitation,
            'invite_url' => url("/api/invitations/accept/{$invitation->token}")
        ]);
    }

    /**
     * Get pending invitations for the authenticated user.
     */
    public function pending(Request $request): JsonResponse
    {
        $invitations = Invitation::where('email', $request->user()->email)
            ->whereNull('accepted_at')
            ->where(function ($query) {
                $query->whereNull('expires_at')
                      ->orWhere('expires_at', '>', now());
            })
            ->get();

        foreach ($invitations as $invitation) {
            $invitation->workspace_name = Workspace::find($invitation->workspace_id)?->name;
        }

        return response()->json($invitations);
    }

    /**
     * Reject an invitation.
     */
    public function reject(Request $request, $token): JsonResponse
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
    public function accept(Request $request, $token): JsonResponse
    {
        $user = $request->user();
        $invitation = Invitation::where('token', $token)
            ->where('email', $user->email)
            ->firstOrFail();

        if ($invitation->expires_at && $invitation->expires_at->isPast()) {
            return response()->json(['message' => 'Invitation expired.'], 422);
        }

        $workspace = Workspace::find($invitation->workspace_id);
        if (!$workspace) {
            return response()->json(['message' => 'Workspace not found.'], 404);
        }

        // Attach user to workspace
        DB::transaction(function () use ($workspace, $user, $invitation) {
            $workspace->users()->syncWithoutDetaching([
                $user->id => ['role' => $invitation->role]
            ]);

            // Set as favorite if they don't have one
            if (!$user->favorite_workspace_id) {
                $user->update(['favorite_workspace_id' => $workspace->id]);
            }

            $invitation->update(['accepted_at' => now()]);
            $invitation->delete(); // delete invitation after successful acceptance
        });

        return response()->json([
            'message' => "Successfully joined the workspace '{$workspace->name}'.",
            'workspace' => $workspace
        ]);
    }
}