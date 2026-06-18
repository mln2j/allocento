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
        $users = DB::table('users')->get();
        foreach ($users as $user) {
            $hasPersonal = DB::table('workspaces')
                ->join('user_workspace', 'workspaces.id', '=', 'user_workspace.workspace_id')
                ->where('user_workspace.user_id', $user->id)
                ->where('workspaces.type', 'personal')
                ->exists();
                
            if (!$hasPersonal) {
                $workspaceId = DB::table('workspaces')->insertGetId([
                    'name' => 'Personal',
                    'type' => 'personal',
                    'icon' => '👤',
                    'currency' => 'EUR',
                    'enabled_features' => json_encode(['categories', 'projects']),
                    'created_at' => now(),
                    'updated_at' => now()
                ]);
                DB::table('user_workspace')->insert([
                    'user_id' => $user->id,
                    'workspace_id' => $workspaceId,
                    'role' => 'owner'
                ]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        //
    }
};
