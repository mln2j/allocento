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
        Schema::create('accounts', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->enum('type', ['personal', 'household', 'organization']);
            $table->foreignId('household_id')->nullable()
                ->constrained('households')->nullOnDelete();
            $table->foreignId('organization_id')->nullable()
                ->constrained('organizations')->nullOnDelete();
            $table->foreignId('owner_user_id')->nullable()
                ->constrained('users')->nullOnDelete();
            $table->string('currency', 3)->default('EUR');
            $table->decimal('opening_balance', 15, 2)->default(0);
            $table->decimal('budget_limit', 15, 2)->nullable();
            $table->timestamps();
        });
    }


    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('accounts');
    }
};
