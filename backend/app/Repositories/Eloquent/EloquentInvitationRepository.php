<?php

namespace App\Repositories\Eloquent;

use App\Models\Invitation;
use App\Repositories\Contracts\InvitationRepositoryInterface;

class EloquentInvitationRepository implements InvitationRepositoryInterface
{
    public function create(array $data)
    {
        return Invitation::create($data);
    }

    public function findByToken(string $token)
    {
        return Invitation::where('token', $token)->first();
    }

    public function getPendingForEmail(string $email)
    {
        return Invitation::with('workspace')->where('email', $email)->get();
    }

    public function delete(int $id)
    {
        $invitation = Invitation::find($id);
        if ($invitation) {
            return $invitation->delete();
        }
        return false;
    }
}
