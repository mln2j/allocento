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
        Schema::table('accounts', function (Blueprint $table) {
            $table->foreignId('workspace_id')->nullable()->constrained('workspaces')->nullOnDelete();
        });

        // Migrate existing data
        // For every account, find its primary/original workspace by grabbing the first one linked to it
        $accounts = DB::table('accounts')->get();
        foreach ($accounts as $account) {
            $pivot = DB::table('account_workspace')->where('account_id', $account->id)->first();
            if ($pivot) {
                DB::table('accounts')->where('id', $account->id)->update(['workspace_id' => $pivot->workspace_id]);
            } else {
                // If no pivot, find the personal workspace of the created_by_user_id
                $personalWorkspace = DB::table('workspaces')
                    ->join('user_workspace', 'workspaces.id', '=', 'user_workspace.workspace_id')
                    ->where('user_workspace.user_id', $account->created_by_user_id)
                    ->where('workspaces.type', 'personal')
                    ->select('workspaces.id')
                    ->first();
                if ($personalWorkspace) {
                    DB::table('accounts')->where('id', $account->id)->update(['workspace_id' => $personalWorkspace->id]);
                }
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('accounts', function (Blueprint $table) {
            $table->dropForeign(['workspace_id']);
            $table->dropColumn('workspace_id');
        });
    }
};
