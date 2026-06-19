<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();
$ws = Illuminate\Support\Facades\DB::table('workspaces')->first();
echo json_encode($ws, JSON_PRETTY_PRINT);
