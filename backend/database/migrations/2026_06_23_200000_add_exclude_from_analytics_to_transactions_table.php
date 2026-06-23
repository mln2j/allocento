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
        Schema::table('transactions', function (Blueprint $table) {
            $table->boolean('exclude_from_analytics')->default(false)->after('is_recurring');
            $table->foreignId('target_account_id')->nullable()->after('account_id')->constrained('accounts')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropForeign(['target_account_id']);
            $table->dropColumn(['exclude_from_analytics', 'target_account_id']);
        });
    }
};
