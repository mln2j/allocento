<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$user = App\Models\User::first();
$req = request();
$req->setUserResolver(function() use ($user) { return $user; });

// Try to find a workspace that HAS accounts, because first() might not have accounts
$ws = $user->workspaces()->has('accounts')->first();
if (!$ws) {
   $ws = App\Models\Workspace::has('accounts')->first();
}

if ($ws) {
    $req->attributes->add(['_workspace' => $ws]);
    $ctrl = new App\Http\Controllers\Api\AccountController();
    echo json_encode($ctrl->index($req)->getData());
} else {
    echo "[]";
}
