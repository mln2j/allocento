<?php

namespace App\Repositories\Contracts;

use App\Models\Account;
use Illuminate\Support\Collection;

interface AccountRepositoryInterface
{
    public function allForUser(int $userId): Collection;

    public function findForUser(int $id, int $userId): ?Account;

    public function createForUser(int $userId, array $data): Account;
}
