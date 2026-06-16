<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use App\Repositories\Contracts\AccountRepositoryInterface;
use App\Repositories\Eloquent\EloquentAccountRepository;
use App\Repositories\Contracts\TransactionRepositoryInterface;
use App\Repositories\Eloquent\EloquentTransactionRepository;
use App\Repositories\Contracts\UserRepositoryInterface;
use App\Repositories\Eloquent\EloquentUserRepository;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(AccountRepositoryInterface::class, EloquentAccountRepository::class);
        $this->app->bind(TransactionRepositoryInterface::class, EloquentTransactionRepository::class);
        $this->app->bind(UserRepositoryInterface::class, EloquentUserRepository::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        \Illuminate\Auth\Notifications\VerifyEmail::createUrlUsing(function ($notifiable) {
            $frontendUrl = env('FRONTEND_URL', 'http://localhost:4200');

            $verifyUrl = \Illuminate\Support\Facades\URL::temporarySignedRoute(
                'verification.verify',
                \Illuminate\Support\Carbon::now()->addMinutes(\Illuminate\Support\Facades\Config::get('auth.verification.expire', 60)),
                [
                    'id' => $notifiable->getKey(),
                    'hash' => sha1($notifiable->getEmailForVerification()),
                ]
            );

            $queryString = parse_url($verifyUrl, PHP_URL_QUERY);
            
            return $frontendUrl . '/auth/verify-email?id=' . $notifiable->getKey() . '&hash=' . sha1($notifiable->getEmailForVerification()) . '&' . $queryString;
        });
        \Illuminate\Auth\Notifications\ResetPassword::createUrlUsing(function ($user, string $token) {
            $frontendUrl = env('FRONTEND_URL', 'http://localhost:4200');
            return $frontendUrl . '/auth/reset-password?token=' . $token . '&email=' . urlencode($user->email);
        });
    }
}
