<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Project extends Model
{
    protected $fillable = [
        'organization_id',
        'name',
        'description',
        'planned_budget',
        'start_date',
        'end_date',
        'status',
    ];

    public function scopeActive($query)
    {
        return $query->whereIn('status', ['planned', 'active']);
    }

    public function scopeArchived($query)
    {
        return $query->where('status', 'archived');
    }
}
