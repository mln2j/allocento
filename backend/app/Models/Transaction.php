<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

use Illuminate\Database\Eloquent\SoftDeletes;

class Transaction extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'account_id',
        'created_by_user_id',
        'category_id',
        'project_id',
        'type',
        'amount',
        'date',
        'description',
        'tags',
        'is_recurring',
        'recurring_rule',
    ];

    protected $casts = [
        'date' => 'datetime',
        'is_recurring' => 'boolean',
        'recurring_rule' => 'array',
        'tags' => 'array',
        'amount' => 'decimal:2',
    ];

    public function account()
    {
        return $this->belongsTo(Account::class);
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function project()
    {
        return $this->belongsTo(Project::class);
    }
}

