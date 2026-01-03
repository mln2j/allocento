<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AccountLink extends Model
{
    protected $fillable = ['from_account_id', 'to_account_id', 'relation_type'];

    public function fromAccount()
    {
        return $this->belongsTo(Account::class, 'from_account_id');
    }

    public function toAccount()
    {
        return $this->belongsTo(Account::class, 'to_account_id');
    }
}


