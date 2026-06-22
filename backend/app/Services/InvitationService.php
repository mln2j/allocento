<?php

namespace App\Services;

use App\Repositories\Contracts\InvitationRepositoryInterface;
use App\Models\User;
use App\Models\Workspace;
use App\Models\Invitation;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use App\Notifications\WorkspaceInvitationReceived;

class InvitationService
{
    protected $invitationRepository;

    public function __construct(InvitationRepositoryInterface $invitationRepository)
    {
        $this->invitationRepository = $invitationRepository;
    }

    public function invite(User $user, Workspace $workspace, array $data)
    {
        $memberRole = $workspace->users()
            ->where('users.id', $user->id)
            ->first()
            ?->pivot
            ->role;

        if (!in_array($memberRole, ['owner', 'manager'])) {
            return 'Unauthorized';
        }

        $role = $data['role'] ?? 'member';

        if ($memberRole === 'manager' && $role === 'manager') {
            return 'Managers cannot invite other managers.';
        }

        $alreadyMember = $workspace->users()
            ->where('email', $data['email'])
            ->exists();

        if ($alreadyMember) {
            return 'User is already a member.';
        }

        $pending = Invitation::where('workspace_id', $workspace->id)
            ->where('email', $data['email'])
            ->where(function ($q) {
                $q->whereNull('expires_at')
                    ->orWhere('expires_at', '>', now());
            })
            ->first();

        if ($pending) {
            return ['error' => 'Pending invitation already exists.', 'invitation' => $pending];
        }

        $invitation = Invitation::create([
            'workspace_id' => $workspace->id,
            'email' => $data['email'],
            'role' => $role,
            'invited_by' => $user->id,
            'token' => Str::random(40),
            'expires_at' => now()->addDays(7),
        ]);

        $invitedUser = User::where('email', $data['email'])->first();
        if ($invitedUser) {
            $invitedUser->notify(new WorkspaceInvitationReceived($workspace->name));
        }

        return $invitation;
    }

    public function getPending(User $user)
    {
        return Invitation::with(['workspace', 'inviter'])
            ->where('email', $user->email)
            ->whereNull('accepted_at')
            ->where(function ($q) {
                $q->whereNull('expires_at')
                    ->orWhere('expires_at', '>', now());
            })
            ->latest()
            ->get();
    }

    public function reject(User $user, string $token)
    {
        $invitation = Invitation::where('token', $token)
            ->where('email', $user->email)
            ->first();

        if (!$invitation) {
            return false;
        }

        $invitation->delete();
        return true;
    }

    public function accept(User $user, string $token)
    {
        $invitation = Invitation::where('token', $token)
            ->where('email', $user->email)
            ->first();

        if (!$invitation) {
            return false; // not found
        }

        if ($invitation->expires_at?->isPast()) {
            return 'Expired';
        }

        $workspace = Workspace::find($invitation->workspace_id);

        if (!$workspace) {
            return 'Workspace not found';
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

        return $workspace;
    }

    public function getForWorkspace(User $user, Workspace $workspace)
    {
        $memberRole = $workspace->users()
            ->where('users.id', $user->id)
            ->first()
            ?->pivot
            ->role;

        if (!in_array($memberRole, ['owner', 'manager'])) {
            return false;
        }

        return Invitation::with('inviter')
            ->where('workspace_id', $workspace->id)
            ->whereNull('accepted_at')
            ->where(function ($q) {
                $q->whereNull('expires_at')
                    ->orWhere('expires_at', '>', now());
            })
            ->latest()
            ->get();
    }

    public function destroyForWorkspace(User $user, Workspace $workspace, Invitation $invitation)
    {
        $memberRole = $workspace->users()
            ->where('users.id', $user->id)
            ->first()
            ?->pivot
            ->role;

        if (!in_array($memberRole, ['owner', 'manager'])) {
            return 'Unauthorized';
        }

        if ($invitation->workspace_id !== $workspace->id) {
            return 'Not found';
        }

        $invitation->delete();
        return true;
    }
}
