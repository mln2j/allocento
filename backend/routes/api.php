<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ReportController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AccountController;
use App\Http\Controllers\Api\TransactionController;
use App\Http\Controllers\Api\HouseholdController;
use App\Http\Controllers\Api\ProjectController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\CategoryController;

Route::post('/login', [AuthController::class, 'login']);
Route::post('/register', [AuthController::class, 'register']);

Route::middleware('auth:sanctum')->group(function () {
    Route::apiResource('accounts', AccountController::class)->only(['index', 'store', 'show']);
    Route::put('accounts/{account}', [AccountController::class, 'update']);
    Route::delete('accounts/{account}', [AccountController::class, 'destroy']);
    Route::get('household/summary', [HouseholdController::class, 'summary']);
    Route::delete('households/{household}', [HouseholdController::class, 'destroy']);
    Route::get('accounts/{account}/transactions', [TransactionController::class, 'index']);
    Route::post('accounts/{account}/transactions', [TransactionController::class, 'store']);
    Route::put('accounts/{account}/transactions/{transaction}', [TransactionController::class, 'update']);
    Route::delete('accounts/{account}/transactions/{transaction}', [TransactionController::class, 'destroy']);
    Route::get('transactions/{transaction}', [TransactionController::class, 'show']);

    Route::get('projects', [ProjectController::class, 'index']);
    Route::post('projects', [ProjectController::class, 'store']);
    Route::get('projects/{project}/summary', [ProjectController::class, 'summary']);

    Route::put('projects/{project}', [ProjectController::class, 'update']);
    Route::get('projects/{project}/summary', [ProjectController::class, 'summary']);

    Route::get('dashboard', DashboardController::class);

    Route::get('categories', [CategoryController::class, 'index']);
    Route::post('categories', [CategoryController::class, 'store']);
    Route::put('categories/{category}', [CategoryController::class, 'update']);
    Route::delete('categories/{category}', [CategoryController::class, 'destroy']);
    Route::post('categories/{from}/merge-into/{to}', [CategoryController::class,'merge']);

    Route::get('reports/spending-by-category', [ReportController::class, 'spendingByCategory']);
});


Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');
