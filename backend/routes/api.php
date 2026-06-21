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

/*
|--------------------------------------------------------------------------
| Public routes
|--------------------------------------------------------------------------
*/

Route::any('/health', function () {
    return response()->json(['status' => 'ok']);
});

Route::post('/login', [AuthController::class, 'login']);
Route::post('/register', [AuthController::class, 'register']);
Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
Route::post('/reset-password', [AuthController::class, 'resetPassword']);
Route::post('/email/verify-code', [AuthController::class, 'verifyEmailCode']);
Route::post('/email/resend', [AuthController::class, 'resendVerificationEmail'])->middleware(['auth:sanctum', 'throttle:1,1']);
Route::post('/email/check-and-send', [AuthController::class, 'checkAndSendVerificationEmail'])->middleware('auth:sanctum');

/*
|--------------------------------------------------------------------------
| Authenticated routes
|--------------------------------------------------------------------------
*/

Route::middleware('auth:sanctum')->group(function () {

    /*
    |--------------------------------------------------------------------------
    | Push Notifications
    |--------------------------------------------------------------------------
    */
    Route::get('/push/public-key', [\App\Http\Controllers\Api\PushController::class, 'vapidPublicKey']);
    Route::post('/push/subscribe', [\App\Http\Controllers\Api\PushController::class, 'subscribe']);
    Route::post('/push/unsubscribe', [\App\Http\Controllers\Api\PushController::class, 'unsubscribe']);
    Route::post('/push/test', [\App\Http\Controllers\Api\PushController::class, 'test']);


    /*
    |--------------------------------------------------------------------------
    | User bootstrap / profile
    |--------------------------------------------------------------------------
    */

    Route::get('/user', function (Request $request) {
        return response()->json(
            $request->user()->load(['favoriteWorkspace', 'workspaces'])
        );
    });

    Route::put('/profile', [\App\Http\Controllers\Api\ProfileController::class, 'update']);
    Route::put('/profile/password', [\App\Http\Controllers\Api\ProfileController::class, 'changePassword']);
    Route::delete('/profile', [\App\Http\Controllers\Api\ProfileController::class, 'destroy']);
    Route::post('/profile/photo', [\App\Http\Controllers\Api\ProfileController::class, 'uploadPhoto']);
    Route::delete('/profile/photo', [\App\Http\Controllers\Api\ProfileController::class, 'deletePhoto']);

    /*
    |--------------------------------------------------------------------------
    | Workspaces (global)
    |--------------------------------------------------------------------------
    */

    Route::get('workspaces', [WorkspaceController::class, 'index']);
    Route::post('workspaces', [WorkspaceController::class, 'store']);
    Route::post('workspaces/{id}/set-favorite', [WorkspaceController::class, 'setFavorite']);

    Route::get('user/accounts', [\App\Http\Controllers\Api\AccountController::class, 'allUserAccounts']);

    /*
    |--------------------------------------------------------------------------
    | Workspace scoped context (MUST have active workspace middleware)
    |--------------------------------------------------------------------------
    */

    Route::middleware('workspace')->group(function () {

        /*
        |-------------------------
        | Workspace core
        |-------------------------
        */

        Route::get('workspaces/{id}', [WorkspaceController::class, 'show']);
        Route::put('workspaces/{id}', [WorkspaceController::class, 'update']);
        Route::delete('workspaces/{id}', [WorkspaceController::class, 'destroy']);

        Route::post('workspaces/{id}/accounts/{accountId}/share', [WorkspaceController::class, 'shareAccount']);
        Route::delete('workspaces/{id}/accounts/{accountId}/share', [WorkspaceController::class, 'unshareAccount']);

        Route::put('workspaces/{id}/members/{userId}', [WorkspaceController::class, 'updateMemberRole']);
        Route::delete('workspaces/{id}/members/{userId}', [WorkspaceController::class, 'removeMember']);
        Route::post('workspaces/{id}/leave', [WorkspaceController::class, 'leave']);

        /*
        |-------------------------
        | Accounts
        |-------------------------
        */

        Route::get('accounts', [AccountController::class, 'index']);
        Route::post('accounts', [AccountController::class, 'store']);
        Route::get('accounts/{account}', [AccountController::class, 'show']);
        Route::put('accounts/{account}', [AccountController::class, 'update']);
        Route::delete('accounts/{account}', [AccountController::class, 'destroy']);
        Route::post('accounts/{account}/set-primary', [AccountController::class, 'setPrimary']);

        /*
        |-------------------------
        | Transactions
        |-------------------------
        */

        Route::get('transactions', [TransactionController::class, 'all']);
        Route::post('transactions/bulk', [TransactionController::class, 'bulk']);

        Route::get('accounts/{account}/transactions', [TransactionController::class, 'index']);
        Route::post('accounts/{account}/transactions', [TransactionController::class, 'store']);
        Route::put('accounts/{account}/transactions/{transaction}', [TransactionController::class, 'update']);
        Route::delete('accounts/{account}/transactions/{transaction}', [TransactionController::class, 'destroy']);

        Route::get('transactions/{transaction}', [TransactionController::class, 'show']);

        /*
        |-------------------------
        | Templates
        |-------------------------
        */

        Route::get('workspaces/{id}/templates', [RecurringTemplateController::class, 'index']);
        Route::post('workspaces/{id}/templates', [RecurringTemplateController::class, 'store']);
        Route::get('workspaces/{id}/templates/{templateId}', [RecurringTemplateController::class, 'show']);
        Route::put('workspaces/{id}/templates/{templateId}', [RecurringTemplateController::class, 'update']);
        Route::delete('workspaces/{id}/templates/{templateId}', [RecurringTemplateController::class, 'destroy']);

        /*
        |-------------------------
        | Dashboard
        |-------------------------
        */

        Route::get('dashboard', DashboardController::class);

        /*
        |-------------------------
        | Categories
        |-------------------------
        */

        Route::get('categories', [CategoryController::class, 'index']);
        Route::post('categories', [CategoryController::class, 'store']);
        Route::put('categories/{category}', [CategoryController::class, 'update']);
        Route::delete('categories/{category}', [CategoryController::class, 'destroy']);
        Route::post('categories/{from}/merge-into/{to}', [CategoryController::class, 'merge']);

        /*
        |-------------------------
        | Projects
        |-------------------------
        */

        Route::get('projects', [\App\Http\Controllers\Api\ProjectController::class, 'index']);
        Route::post('projects', [\App\Http\Controllers\Api\ProjectController::class, 'store']);
        Route::get('projects/{project}', [\App\Http\Controllers\Api\ProjectController::class, 'show']);
        Route::put('projects/{project}', [\App\Http\Controllers\Api\ProjectController::class, 'update']);
        Route::delete('projects/{project}', [\App\Http\Controllers\Api\ProjectController::class, 'destroy']);

        /*
        |-------------------------
        | Reports
        |-------------------------
        */

        Route::get('reports/spending-by-category', [ReportController::class, 'spendingByCategory']);

        /*
        |--------------------------------------------------------------------------
        | Invitations (FINAL CLEAN ARCHITECTURE)
        |--------------------------------------------------------------------------
        |
        | - invite = workspace scoped
        | - pending = user scoped
        | - accept/reject = token based (no workspace needed)
        |
        */

        Route::get('workspaces/{workspace}/invitations', [InvitationController::class, 'index']);
        Route::post('workspaces/{workspace}/invitations', [InvitationController::class, 'invite']);
        Route::delete('workspaces/{workspace}/invitations/{invitation}', [InvitationController::class, 'destroy']);
    });

    Route::get('invitations/pending', [InvitationController::class, 'pending']);
    Route::post('invitations/{token}/accept', [InvitationController::class, 'accept']);
    Route::delete('invitations/{token}/reject', [InvitationController::class, 'reject']);
});

// Trigger deploy

// Trigger deploy 2
