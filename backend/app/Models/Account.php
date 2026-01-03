<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Account extends Model
{
    protected $fillable = [
        'name', 'type', 'household_id', 'organization_id',
        'owner_user_id', 'currency', 'opening_balance', 'budget_limit',
    ];

    public function household()
    {
        return $this->belongsTo(Household::class);
    }

    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }

    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_user_id');
    }

    public function transactions()
    {
        return $this->hasMany(Transaction::class);
    }

    public function linksFrom()
    {
        return $this->hasMany(AccountLink::class, 'from_account_id');
    }

    public function linksTo()
    {
        return $this->hasMany(AccountLink::class, 'to_account_id');
    }
}


