<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // For all existing workspaces where enabled_features is null:
        // Set 'categories' for personal/household, and 'categories', 'projects' for company
        \Illuminate\Support\Facades\DB::table('workspaces')
            ->whereNull('enabled_features')
            ->whereIn('type', ['personal', 'household'])
            ->update(['enabled_features' => json_encode(['categories'])]);

        \Illuminate\Support\Facades\DB::table('workspaces')
            ->whereNull('enabled_features')
            ->where('type', 'company')
            ->update(['enabled_features' => json_encode(['categories', 'projects'])]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        //
    }
};
