<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

        $user = User::factory()->create([
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => bcrypt('password'),
        ]);

        $workspace = \App\Models\Workspace::create([
            'name' => 'Osobno',
            'type' => 'personal',
            'currency' => 'EUR',
        ]);

        $workspace->users()->attach($user->id, ['role' => 'owner']);
        $user->update(['favorite_workspace_id' => $workspace->id]);

        // Add a default account to the seeded workspace
        $account = \App\Models\Account::create([
            'name' => 'Tekući račun',
            'type' => 'checking',
            'created_by_user_id' => $user->id,
            'currency' => 'EUR',
            'balance' => 1000.00,
            'opening_balance' => 1000.00,
            'is_primary' => true,
        ]);
        $workspace->accounts()->attach($account->id);
    }
}
