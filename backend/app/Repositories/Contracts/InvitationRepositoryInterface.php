<?php

namespace App\Repositories\Contracts;

interface InvitationRepositoryInterface
{
    public function create(array $data);
    public function findByToken(string $token);
    public function getPendingForEmail(string $email);
    public function delete(int $id);
}
