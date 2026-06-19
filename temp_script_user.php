<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$user = \App\Models\User::first();
$user->load(['favoriteWorkspace', 'workspaces']);
echo json_encode($user->toArray(), JSON_PRETTY_PRINT);
