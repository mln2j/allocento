<?php $u = App\Models\User::first(); $a = $u->workspaces()->with("accounts")->get()->pluck("accounts.*.id")->flatten()->unique()->toArray(); dump($a);
