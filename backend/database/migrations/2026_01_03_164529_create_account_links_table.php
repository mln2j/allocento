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
        Schema::create('account_links', function (Blueprint $table) {
            $table->id();
            $table->foreignId('from_account_id')->constrained('accounts')->cascadeOnDelete();
            $table->foreignId('to_account_id')->constrained('accounts')->cascadeOnDelete();
            $table->string('relation_type')->default('linked_budget');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('account_links');
    }
};
