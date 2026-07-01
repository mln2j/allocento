<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Category extends Model
{
    protected $fillable = [
        'workspace_id',
        'name',
        'type',
        'color'
    ];

    protected $appends = ['color'];

    public function getColorAttribute()
    {
        return '#' . substr(md5($this->name ?? 'default'), 0, 6);
    }

    public function transactions()
    {
        return $this->hasMany(Transaction::class);
    }

    public function workspace()
    {
        return $this->belongsTo(Workspace::class);
    }
}
