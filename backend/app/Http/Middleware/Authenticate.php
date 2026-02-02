<?php

namespace App\Http\Middleware;

use Illuminate\Auth\Middleware\Authenticate as Middleware;
use Illuminate\Http\Request;

class Authenticate extends Middleware
{
    /**
     * Get the path the user should be redirected to when they are not authenticated.
     */
    protected function redirectTo(Request $request): ?string
    {
        // Za API zahtjeve nema redirecta na login rutu,
        // samo vraćamo 401 JSON.
        if ($request->expectsJson() || $request->is('api/*')) {
            return null;
        }

        // Ako kasnije dodaš web login, možeš ovdje vratiti route('login').
        return null;
    }
}
