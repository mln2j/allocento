<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Workspace extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'name',
        'type',
        'currency',
        'enabled_features',
    ];

    protected function casts(): array
    {
        return [
            'enabled_features' => 'array',
        ];
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'user_workspace')
            ->withPivot('role')
            ->withTimestamps();
    }

    public function accounts(): BelongsToMany
    {
        return $this->belongsToMany(Account::class, 'account_workspace')
            ->withTimestamps();
    }

    public function recurringTemplates(): HasMany
    {
        return $this->hasMany(RecurringTemplate::class);
    }

    public function projects(): HasMany
    {
        return $this->hasMany(Project::class);
    }

    /**
     * Get all transactions associated with this workspace.
     */
    public function transactions()
    {
        return Transaction::whereIn('account_id', $this->accounts()->pluck('accounts.id'));
    }
}
