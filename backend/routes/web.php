<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json(['message' => 'API only'], 200);
});

// Email Previews
Route::get('/mail-preview/verify', function () {
    return new \App\Mail\VerifyEmailCodeMail('123456', 'Korisnik', 'hr');
});

Route::get('/mail-preview/reset', function () {
    return new \App\Mail\ResetPasswordMail('654321', 'Korisnik', 'hr');
});
