<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

use Illuminate\Database\Eloquent\SoftDeletes;

class Transaction extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'account_id',
        'target_account_id',
        'created_by_user_id',
        'category_id',

        'type',
        'amount',
        'date',
        'description',
        'tags',
        'is_recurring',
        'recurring_rule',
        'exclude_from_analytics',
    ];

    protected $casts = [
        'date' => 'datetime',
        'is_recurring' => 'boolean',
        'exclude_from_analytics' => 'boolean',
        'recurring_rule' => 'array',
        'tags' => 'array',
        'amount' => 'decimal:2',
        'target_account_id' => 'integer',
    ];

    public function account()
    {
        return $this->belongsTo(Account::class);
    }

    public function targetAccount()
    {
        return $this->belongsTo(Account::class, 'target_account_id');
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function category()
    {
        return $this->belongsTo(Category::class);
    }


}

