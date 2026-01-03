<?php

namespace App\Services;

use App\Models\User;
use App\Repositories\Contracts\TransactionRepositoryInterface;
use Illuminate\Support\Collection;

class TransactionService
{
    public function __construct(
        private readonly TransactionRepositoryInterface $transactions
    ) {
    }

    public function listForAccount(User $user, int $accountId): Collection
    {
        return $this->transactions->allForAccount($accountId, $user->id);
    }

    public function createForAccount(User $user, int $accountId, array $data)
    {
        return $this->transactions->createForAccount($accountId, $user->id, $data);
    }
}
