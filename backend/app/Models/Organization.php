<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Organization extends Model
{
    protected $fillable = ['name', 'description', 'owner_id'];

    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function users()
    {
        return $this->hasMany(User::class);
    }

    public function accounts()
    {
        return $this->hasMany(Account::class);
    }

    public function projects()
    {
        return $this->hasMany(Project::class);
    }
}

