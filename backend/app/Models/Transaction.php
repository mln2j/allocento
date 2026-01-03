<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Transaction extends Model
{
    protected $fillable = [
        'account_id', 'project_id', 'user_id', 'category_id',
        'type', 'amount', 'date', 'description',
        'is_recurring', 'recurring_rule',
    ];

    protected $casts = [
        'date' => 'datetime',
        'is_recurring' => 'boolean',
        'recurring_rule' => 'array',
    ];

    public function account()
    {
        return $this->belongsTo(Account::class);
    }

    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function category()
    {
        return $this->belongsTo(Category::class);
    }
}

