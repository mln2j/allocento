<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // First change to string so we drop the enum check constraint
        Schema::table('accounts', function (Blueprint $table) {
            $table->string('type')->default('cash')->change();
        });

        // Now we can safely update
        DB::table('accounts')->whereIn('type', ['checking', 'savings'])->update(['type' => 'bank']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('accounts')->where('type', 'bank')->update(['type' => 'checking']);
        Schema::table('accounts', function (Blueprint $table) {
            $table->enum('type', ['checking', 'savings', 'cash', 'credit', 'investment', 'other'])->default('cash')->change();
        });
    }
};
