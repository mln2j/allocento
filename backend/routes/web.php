<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json(['message' => 'API only'], 200);
});

// Email Previews (use ?lang=en or ?lang=hr)
Route::get('/mail-preview/verify', function (\Illuminate\Http\Request $request) {
    $lang = $request->query('lang', 'hr');
    return new \App\Mail\VerifyEmailCodeMail('123456', 'Korisnik', $lang);
});

Route::get('/mail-preview/reset', function (\Illuminate\Http\Request $request) {
    $lang = $request->query('lang', 'hr');
    return new \App\Mail\ResetPasswordMail('654321', 'Korisnik', $lang);
});
