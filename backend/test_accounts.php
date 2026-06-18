<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$user = App\Models\User::first();
$req = request();
$req->setUserResolver(function() use ($user) { return $user; });

// Get a workspace that has accounts
$ws = $user->workspaces()->first();
$req->attributes->add(['_workspace' => $ws]);

$ctrl = new App\Http\Controllers\Api\AccountController();
echo json_encode($ctrl->index($req)->getData());
