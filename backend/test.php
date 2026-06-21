<?php
require __DIR__.'/vendor/autoload.php';
\ = require_once __DIR__.'/bootstrap/app.php';
\ = \->make(Illuminate\Contracts\Console\Kernel::class);
\->bootstrap();

\ = new \App\Models\Transaction();
\->date = '2026-06-21T20:25:00.000Z';
echo \->date;
