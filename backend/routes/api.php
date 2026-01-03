<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AccountController;

use App\Http\Controllers\Api\TransactionController;

Route::middleware('auth:sanctum')->group(function () {
    Route::apiResource('accounts', AccountController::class)->only(['index', 'store', 'show']);

    Route::get('accounts/{account}/transactions', [TransactionController::class, 'index']);
    Route::post('accounts/{account}/transactions', [TransactionController::class, 'store']);
});



Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');
