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
use App\Http\Controllers\Api\OrganizationController;
use App\Http\Controllers\Api\InvitationController;

Route::any('/health', function () {
    return response()->json(['status' => 'ok']);
});

Route::post('/login', [AuthController::class, 'login']);
Route::post('/register', [AuthController::class, 'register']);

Route::middleware('auth:sanctum')->group(function () {
    Route::apiResource('accounts', AccountController::class)->only(['index', 'store', 'show']);
    Route::put('accounts/{account}', [AccountController::class, 'update']);
    Route::delete('accounts/{account}', [AccountController::class, 'destroy']);
    Route::post('accounts/{account}/set-primary', [AccountController::class, 'setPrimary']);
    Route::get('household/summary', [HouseholdController::class, 'summary']);
    Route::get('household', [HouseholdController::class, 'show']);
    Route::post('household', [HouseholdController::class, 'store']);
    Route::put('household', [HouseholdController::class, 'update']);
    Route::delete('households/{household}', [HouseholdController::class, 'destroy']);

    Route::get('organization', [OrganizationController::class, 'show']);
    Route::post('organization', [OrganizationController::class, 'store']);
    Route::put('organization', [OrganizationController::class, 'update']);
    Route::delete('organizations/{organization}', [OrganizationController::class, 'destroy']);

    Route::post('invitations/invite', [InvitationController::class, 'invite']);
    Route::get('invitations/pending', [InvitationController::class, 'pending']);
    Route::post('invitations/accept/{token}', [InvitationController::class, 'accept']);
    Route::delete('invitations/reject/{token}', [InvitationController::class, 'reject']);

    Route::get('transactions', [TransactionController::class, 'all']);
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

    // Profile Routes
    Route::put('/profile', [\App\Http\Controllers\Api\ProfileController::class, 'update']);
    Route::put('/profile/password', [\App\Http\Controllers\Api\ProfileController::class, 'changePassword']);
    Route::delete('/profile', [\App\Http\Controllers\Api\ProfileController::class, 'destroy']);
    Route::post('/profile/photo', [\App\Http\Controllers\Api\ProfileController::class, 'uploadPhoto']);
    Route::delete('/profile/photo', [\App\Http\Controllers\Api\ProfileController::class, 'deletePhoto']);
});


Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');
