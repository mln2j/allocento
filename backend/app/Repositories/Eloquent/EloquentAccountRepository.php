<?php


namespace App\Repositories\Eloquent;

use App\Models\Account;
use App\Repositories\Contracts\AccountRepositoryInterface;
use Illuminate\Support\Collection;

class EloquentAccountRepository implements AccountRepositoryInterface
{
    public function allForUser(int $userId): Collection
    {
        return Account::query()
            ->where(function ($q) use ($userId) {
                $q->where('owner_user_id', $userId)
                    ->orWhereHas('household.users', fn($q2) => $q2->where('users.id', $userId))
                    ->orWhereHas('organization.users', fn($q2) => $q2->where('users.id', $userId));
            })
            ->get();
    }

    public function findForUser(int $id, int $userId): ?Account
    {
        return Account::query()
            ->where('id', $id)
            ->where(function ($q) use ($userId) {
                $q->where('owner_user_id', $userId)
                    ->orWhereHas('household.users', fn($q2) => $q2->where('users.id', $userId))
                    ->orWhereHas('organization.users', fn($q2) => $q2->where('users.id', $userId));
            })
            ->first();
    }

    public function createForUser(int $userId, array $data): Account
    {
        $data['owner_user_id'] = $userId;

        return Account::create($data);
    }
}
