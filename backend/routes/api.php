<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AccountController;
use App\Http\Controllers\Api\TransactionController;
use App\Http\Controllers\Api\HouseholdController;
use App\Http\Controllers\Api\ProjectController;

Route::middleware('auth:sanctum')->group(function () {
    Route::apiResource('accounts', AccountController::class)->only(['index', 'store', 'show']);
    Route::get('household/summary', [HouseholdController::class, 'summary']);
    Route::get('accounts/{account}/transactions', [TransactionController::class, 'index']);
    Route::post('accounts/{account}/transactions', [TransactionController::class, 'store']);

    Route::get('projects', [ProjectController::class, 'index']);
    Route::post('projects', [ProjectController::class, 'store']);
    Route::get('projects/{project}/summary', [ProjectController::class, 'summary']);
});


Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');
