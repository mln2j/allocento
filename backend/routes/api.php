<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ReportController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AccountController;
use App\Http\Controllers\Api\TransactionController;
use App\Http\Controllers\Api\WorkspaceController;
use App\Http\Controllers\Api\RecurringTemplateController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\InvitationController;

Route::any('/health', function () {
    return response()->json(['status' => 'ok']);
});

Route::post('/login', [AuthController::class, 'login']);
Route::post('/register', [AuthController::class, 'register']);

Route::middleware('auth:sanctum')->group(function () {
    
    // Workspaces - General Management
    Route::get('workspaces', [WorkspaceController::class, 'index']);
    Route::post('workspaces', [WorkspaceController::class, 'store']);
    Route::post('workspaces/{id}/set-favorite', [WorkspaceController::class, 'setFavorite']);

    // Profile Routes
    Route::put('/profile', [\App\Http\Controllers\Api\ProfileController::class, 'update']);
    Route::put('/profile/password', [\App\Http\Controllers\Api\ProfileController::class, 'changePassword']);
    Route::delete('/profile', [\App\Http\Controllers\Api\ProfileController::class, 'destroy']);
    Route::post('/profile/photo', [\App\Http\Controllers\Api\ProfileController::class, 'uploadPhoto']);
    Route::delete('/profile/photo', [\App\Http\Controllers\Api\ProfileController::class, 'deletePhoto']);

    // User Profile Bootstrap Info
    Route::get('/user', function (Request $request) {
        return response()->json($request->user()->load(['favoriteWorkspace', 'workspaces']));
    });

    // Workspace Scoped Context Routes
    Route::middleware('workspace')->group(function () {
        
        // Workspace Details & Member Management
        Route::get('workspaces/{id}', [WorkspaceController::class, 'show']);
        Route::put('workspaces/{id}', [WorkspaceController::class, 'update']);
        Route::delete('workspaces/{id}', [WorkspaceController::class, 'destroy']);
        Route::post('workspaces/{id}/accounts/{accountId}/share', [WorkspaceController::class, 'shareAccount']);
        Route::delete('workspaces/{id}/accounts/{accountId}/share', [WorkspaceController::class, 'unshareAccount']);
        Route::delete('workspaces/{id}/members/{userId}', [WorkspaceController::class, 'removeMember']);

        // Accounts
        Route::apiResource('accounts', AccountController::class)->only(['index', 'store', 'show']);
        Route::put('accounts/{account}', [AccountController::class, 'update']);
        Route::delete('accounts/{account}', [AccountController::class, 'destroy']);
        Route::post('accounts/{account}/set-primary', [AccountController::class, 'setPrimary']);

        // Transactions CRUD
        Route::get('transactions', [TransactionController::class, 'all']);
        Route::post('transactions/bulk', [TransactionController::class, 'bulk']);
        Route::get('accounts/{account}/transactions', [TransactionController::class, 'index']);
        Route::post('accounts/{account}/transactions', [TransactionController::class, 'store']);
        Route::put('accounts/{account}/transactions/{transaction}', [TransactionController::class, 'update']);
        Route::delete('accounts/{account}/transactions/{transaction}', [TransactionController::class, 'destroy']);
        Route::get('transactions/{transaction}', [TransactionController::class, 'show']);

        // Recurring Templates CRUD
        Route::get('workspaces/{id}/templates', [RecurringTemplateController::class, 'index']);
        Route::post('workspaces/{id}/templates', [RecurringTemplateController::class, 'store']);
        Route::get('workspaces/{id}/templates/{templateId}', [RecurringTemplateController::class, 'show']);
        Route::put('workspaces/{id}/templates/{templateId}', [RecurringTemplateController::class, 'update']);
        Route::delete('workspaces/{id}/templates/{templateId}', [RecurringTemplateController::class, 'destroy']);

        // Dashboard
        Route::get('dashboard', DashboardController::class);

        // Categories
        Route::get('categories', [CategoryController::class, 'index']);
        Route::post('categories', [CategoryController::class, 'store']);
        Route::put('categories/{category}', [CategoryController::class, 'update']);
        Route::delete('categories/{category}', [CategoryController::class, 'destroy']);
        Route::post('categories/{from}/merge-into/{to}', [CategoryController::class, 'merge']);

        // Reports
        Route::get('reports/spending-by-category', [ReportController::class, 'spendingByCategory']);

        // Invitations
        Route::post('invitations/invite', [InvitationController::class, 'invite']);
        Route::get('invitations/pending', [InvitationController::class, 'pending']);
        Route::post('invitations/accept/{token}', [InvitationController::class, 'accept']);
        Route::delete('invitations/reject/{token}', [InvitationController::class, 'reject']);
    });
});
