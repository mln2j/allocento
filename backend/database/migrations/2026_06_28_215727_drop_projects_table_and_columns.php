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
        if (Schema::hasColumn('transactions', 'project_id')) {
            Schema::table('transactions', function (Blueprint $table) {
                // Drop foreign key first if it exists
                // We'll just drop the column since we don't know the exact foreign key name and it might not be strictly constrained
                // or we can wrap in try-catch if constraint fails.
                $table->dropForeign(['project_id']);
                $table->dropColumn('project_id');
            });
        }
        
        Schema::dropIfExists('projects');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No down migration
    }
};
