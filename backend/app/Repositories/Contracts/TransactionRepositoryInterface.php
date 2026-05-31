<?php

namespace App\Repositories\Contracts;

use App\Models\Transaction;
use Illuminate\Support\Collection;

interface TransactionRepositoryInterface
{
    public function allForAccount(int $accountId): Collection;

    public function createForAccount(int $accountId, int $userId, array $data): Transaction;

    public function sumForAccount(int $accountId, ?string $type = null): float;

    public function balanceForAccount(int $accountId): float;
}
