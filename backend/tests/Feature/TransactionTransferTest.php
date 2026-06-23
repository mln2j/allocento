<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\User;
use App\Models\Workspace;
use App\Models\Transaction;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TransactionTransferTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected Workspace $workspace;
    protected Account $checkingAccount;
    protected Account $walletAccount;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->workspace = Workspace::create([
            'name' => 'Test Workspace',
            'type' => 'personal',
        ]);
        $this->user->workspaces()->attach($this->workspace->id, ['role' => 'owner']);
        $this->user->update(['favorite_workspace_id' => $this->workspace->id]);

        $this->checkingAccount = Account::create([
            'name' => 'Tekući',
            'type' => 'bank',
            'created_by_user_id' => $this->user->id,
            'currency' => 'EUR',
            'balance' => 1000.00,
            'opening_balance' => 1000.00,
            'workspace_id' => $this->workspace->id,
        ]);
        $this->checkingAccount->workspaces()->attach($this->workspace->id);

        $this->walletAccount = Account::create([
            'name' => 'Novčanik',
            'type' => 'cash',
            'created_by_user_id' => $this->user->id,
            'currency' => 'EUR',
            'balance' => 100.00,
            'opening_balance' => 100.00,
            'workspace_id' => $this->workspace->id,
        ]);
        $this->walletAccount->workspaces()->attach($this->workspace->id);
    }

    public function test_can_create_transfer_transaction(): void
    {
        $this->actingAs($this->user);

        $response = $this->postJson("/api/accounts/{$this->checkingAccount->id}/transactions", [
            'type' => 'transfer',
            'target_account_id' => $this->walletAccount->id,
            'amount' => 150.00,
            'date' => now()->toDateTimeString(),
            'description' => 'Isplata tekući u novčanik',
        ]);

        $response->assertCreated();

        // Check balances
        $this->assertEquals(850.00, $this->checkingAccount->fresh()->balance);
        $this->assertEquals(250.00, $this->walletAccount->fresh()->balance);

        // Check transactions
        $transactions = Transaction::all();
        $this->assertCount(2, $transactions);

        // Source transaction: expense, exclude_from_analytics = true
        $source = $transactions->where('account_id', $this->checkingAccount->id)->first();
        $this->assertEquals('expense', $source->type);
        $this->assertEquals(150.00, $source->amount);
        $this->assertTrue($source->exclude_from_analytics);
        $this->assertEquals($this->walletAccount->id, $source->target_account_id);

        // Target transaction: income, exclude_from_analytics = true
        $target = $transactions->where('account_id', $this->walletAccount->id)->first();
        $this->assertEquals('income', $target->type);
        $this->assertEquals(150.00, $target->amount);
        $this->assertTrue($target->exclude_from_analytics);
        $this->assertEquals($this->checkingAccount->id, $target->target_account_id);
    }

    public function test_can_update_transfer_transaction(): void
    {
        $this->actingAs($this->user);

        // Create initial transfer
        $this->postJson("/api/accounts/{$this->checkingAccount->id}/transactions", [
            'type' => 'transfer',
            'target_account_id' => $this->walletAccount->id,
            'amount' => 150.00,
            'date' => '2026-06-23 12:00:00',
            'description' => 'Isplata tekući u novčanik',
        ]);

        $source = Transaction::where('account_id', $this->checkingAccount->id)->firstOrFail();

        // Update transfer amount
        $response = $this->putJson("/api/accounts/{$this->checkingAccount->id}/transactions/{$source->id}", [
            'amount' => 200.00,
            'date' => '2026-06-23 12:00:00',
            'description' => 'Updated transfer',
        ]);

        $response->assertOk();

        // Check updated balances
        $this->assertEquals(800.00, $this->checkingAccount->fresh()->balance);
        $this->assertEquals(300.00, $this->walletAccount->fresh()->balance);

        // Check updated transactions
        $transactions = Transaction::all();
        $this->assertCount(2, $transactions);

        foreach ($transactions as $tx) {
            $this->assertEquals(200.00, $tx->amount);
            $this->assertEquals('Updated transfer', $tx->description);
            $this->assertTrue($tx->exclude_from_analytics);
        }
    }

    public function test_can_delete_transfer_transaction(): void
    {
        $this->actingAs($this->user);

        // Create initial transfer
        $this->postJson("/api/accounts/{$this->checkingAccount->id}/transactions", [
            'type' => 'transfer',
            'target_account_id' => $this->walletAccount->id,
            'amount' => 150.00,
            'date' => '2026-06-23 12:00:00',
            'description' => 'Isplata tekući u novčanik',
        ]);

        $source = Transaction::where('account_id', $this->checkingAccount->id)->firstOrFail();

        // Delete transfer
        $response = $this->deleteJson("/api/accounts/{$this->checkingAccount->id}/transactions/{$source->id}");

        $response->assertNoContent();

        // Check balances are reverted
        $this->assertEquals(1000.00, $this->checkingAccount->fresh()->balance);
        $this->assertEquals(100.00, $this->walletAccount->fresh()->balance);

        // Check both transactions are soft-deleted or deleted
        $this->assertCount(0, Transaction::all());
    }
}
