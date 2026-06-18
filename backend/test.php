<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

$u = \App\Models\User::where('email', 'fire.nos12337@gmail.com')->first();
echo "User: {$u->id}\n";
$w = \App\Models\Workspace::where('name', 'gtrgrt')->first();
echo "Workspace: {$w->id}\n";
$pivot = \Illuminate\Support\Facades\DB::table('user_workspace')->where('user_id', $u->id)->where('workspace_id', $w->id)->count();
echo "Pivot count: $pivot\n";

$found = $u->workspaces()->where('workspaces.id', $w->id)->first();
echo "Found via where workspaces.id: ".($found ? $found->id : 'No')."\n";

$found2 = $u->workspaces()->where('workspace_id', $w->id)->first();
echo "Found via where workspace_id: ".($found2 ? $found2->id : 'No')."\n";
