<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Account extends Model
{
    use SoftDeletes;
    protected $fillable = [
        'name',
        'type',
        'created_by_user_id',
        'currency',
        'balance',
        'opening_balance',
        'is_primary',
        'is_archived',
    ];

    protected $casts = [
        'is_primary' => 'boolean',
        'is_archived' => 'boolean',
        'balance' => 'decimal:2',
        'opening_balance' => 'decimal:2',
    ];

    public function workspaces()
    {
        return $this->belongsToMany(Workspace::class, 'account_workspace')
            ->withTimestamps();
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function transactions()
    {
        return $this->hasMany(Transaction::class);
    }
}


