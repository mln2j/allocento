<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invitation;
use App\Models\Workspace;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\JsonResponse;

class InvitationController extends Controller
{
    /**
     * Invite user to workspace
     */
    public function invite(Request $request, Workspace $workspace): JsonResponse
    {
        $user = $request->user();

        $memberRole = $workspace->users()
            ->where('users.id', $user->id)
            ->first()
            ?->pivot
            ->role;

        if (!in_array($memberRole, ['owner', 'manager'])) {
            return response()->json([
                'message' => 'Unauthorized to invite users to this workspace.'
            ], 403);
        }

        $validated = $request->validate([
            'email' => ['required', 'email'],
            'role' => ['sometimes', 'in:manager,member'],
        ]);

        $role = $validated['role'] ?? 'member';

        if ($memberRole === 'manager' && $role === 'manager') {
            return response()->json([
                'message' => 'Managers cannot invite other managers.'
            ], 403);
        }

        $alreadyMember = $workspace->users()
            ->where('email', $validated['email'])
            ->exists();

        if ($alreadyMember) {
            return response()->json([
                'message' => 'User is already a member.'
            ], 422);
        }

        $pending = Invitation::where('workspace_id', $workspace->id)
            ->where('email', $validated['email'])
            ->where(function ($q) {
                $q->whereNull('expires_at')
                    ->orWhere('expires_at', '>', now());
            })
            ->first();

        if ($pending) {
            return response()->json([
                'message' => 'Pending invitation already exists.',
                'invitation' => $pending
            ], 422);
        }

        $invitation = Invitation::create([
            'workspace_id' => $workspace->id,
            'email' => $validated['email'],
            'role' => $role,
            'invited_by' => $user->id,
            'token' => Str::random(40),
            'expires_at' => now()->addDays(7),
        ]);

        $invitedUser = \App\Models\User::where('email', $validated['email'])->first();
        if ($invitedUser) {
            $invitedUser->notify(new \App\Notifications\WorkspaceInvitationReceived($workspace->name));
        }

        return response()->json([
            'message' => 'Invitation created successfully.',
            'invitation' => $invitation,
        ]);
    }

    /**
     * Pending invitations for logged user
     */
    public function pending(Request $request): JsonResponse
    {
        $invitations = Invitation::with(['workspace', 'inviter'])
            ->where('email', $request->user()->email)
            ->whereNull('accepted_at')
            ->where(function ($q) {
                $q->whereNull('expires_at')
                    ->orWhere('expires_at', '>', now());
            })
            ->latest()
            ->get();

        return response()->json($invitations);
    }

    /**
     * Reject invitation
     */
    public function reject(Request $request, $token): JsonResponse
    {
        $invitation = Invitation::where('token', $token)
            ->where('email', $request->user()->email)
            ->firstOrFail();

        $invitation->delete();

        return response()->json([
            'message' => 'Invitation rejected.'
        ]);
    }

    /**
     * Accept invitation
     */
    public function accept(Request $request, $token): JsonResponse
    {
        $user = $request->user();

        $invitation = Invitation::where('token', $token)
            ->where('email', $user->email)
            ->firstOrFail();

        if ($invitation->expires_at?->isPast()) {
            return response()->json([
                'message' => 'Invitation expired.'
            ], 422);
        }

        $workspace = Workspace::find($invitation->workspace_id);

        if (!$workspace) {
            return response()->json([
                'message' => 'Workspace not found.'
            ], 404);
        }

        DB::transaction(function () use ($workspace, $user, $invitation) {

            $workspace->users()->syncWithoutDetaching([
                $user->id => ['role' => $invitation->role]
            ]);

            if (!$user->favorite_workspace_id) {
                $user->update([
                    'favorite_workspace_id' => $workspace->id
                ]);
            }

            $invitation->update([
                'accepted_at' => now()
            ]);

            $invitation->delete();
        });

        return response()->json([
            'message' => "Successfully joined '{$workspace->name}'.",
            'workspace' => $workspace
        ]);
    }

    /**
     * Get pending invitations for a specific workspace (Owner/Manager only)
     */
    public function index(Request $request, Workspace $workspace): JsonResponse
    {
        $user = $request->user();

        $memberRole = $workspace->users()
            ->where('users.id', $user->id)
            ->first()
            ?->pivot
            ->role;

        if (!in_array($memberRole, ['owner', 'manager'])) {
            return response()->json([
                'message' => 'Unauthorized to view invitations for this workspace.'
            ], 403);
        }

        $invitations = Invitation::with('inviter')
            ->where('workspace_id', $workspace->id)
            ->whereNull('accepted_at')
            ->where(function ($q) {
                $q->whereNull('expires_at')
                    ->orWhere('expires_at', '>', now());
            })
            ->latest()
            ->get();

        return response()->json($invitations);
    }

    /**
     * Delete/Revoke an active invitation for a workspace (Owner/Manager only)
     */
    public function destroy(Request $request, Workspace $workspace, Invitation $invitation): JsonResponse
    {
        $user = $request->user();

        $memberRole = $workspace->users()
            ->where('users.id', $user->id)
            ->first()
            ?->pivot
            ->role;

        if (!in_array($memberRole, ['owner', 'manager'])) {
            return response()->json([
                'message' => 'Unauthorized to manage invitations for this workspace.'
            ], 403);
        }

        if ($invitation->workspace_id !== $workspace->id) {
            return response()->json([
                'message' => 'Invitation not found in this workspace.'
            ], 404);
        }

        $invitation->delete();

        return response()->json([
            'message' => 'Invitation revoked successfully.'
        ]);
    }
}
