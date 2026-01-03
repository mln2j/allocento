<?php

namespace App\Repositories\Contracts;

use App\Models\Transaction;
use Illuminate\Support\Collection;

interface TransactionRepositoryInterface
{
    public function allForAccount(int $accountId, int $userId): Collection;

    public function createForAccount(int $accountId, int $userId, array $data): Transaction;

    public function sumForAccount(int $accountId, int $userId, ?string $type = null): float;

    public function sumForProject(int $projectId, int $userId, ?string $type = null): float;
}
