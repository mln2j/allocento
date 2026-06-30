<?php
$data = [
    'account_id' => 39,
    'created_by_user_id' => 13,
    'type' => 'expense',
    'amount' => 100,
    'date' => '2026-06-30 08:22:39',
    'category_id' => null,
    'target_account_id' => null,
    'description' => null,
];

try {
    $t = App\Models\Transaction::create($data);
    file_put_contents('test_out.txt', "Success: " . $t->id);
} catch (\Exception $e) {
    file_put_contents('test_out.txt', $e->getMessage());
}
