<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AuthService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function __construct(private AuthService $authService) {}

    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required'],
        ]);

        try {
            $result = $this->authService->login($validated['email'], $validated['password']);
            return response()->json($result);
        } catch (ValidationException $e) {
            return response()->json($e->errors(), 422);
        }
    }

    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string'],
            'email' => ['required', 'email', 'unique:users'],
            'password' => ['required', 'min:6'],
        ]);

        try {
            $result = $this->authService->register($validated);
            return response()->json($result, 201);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }

    public function verifyEmailCode(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email',
            'code' => 'required|string|size:6',
        ]);

        $record = \Illuminate\Support\Facades\DB::table('email_verification_codes')
            ->where('email', $request->email)
            ->where('code', $request->code)
            ->first();

        if (!$record) {
            return response()->json(['message' => 'Invalid verification code.'], 400);
        }

        if (now()->greaterThan($record->expires_at)) {
            return response()->json(['message' => 'Verification code has expired.'], 400);
        }

        $user = \App\Models\User::where('email', $request->email)->first();
        if ($user) {
            if (!$user->hasVerifiedEmail()) {
                $user->markEmailAsVerified();
                event(new \Illuminate\Auth\Events\Verified($user));
            }
        }

        \Illuminate\Support\Facades\DB::table('email_verification_codes')
            ->where('email', $request->email)->delete();

        return response()->json(['message' => 'Email verified successfully.']);
    }

    public function resendVerificationEmail(Request $request): JsonResponse
    {
        if ($request->user()->hasVerifiedEmail()) {
            return response()->json(['message' => 'Email already verified.']);
        }

        $request->user()->sendEmailVerificationNotification();

        return response()->json(['message' => 'Verification link sent.']);
    }

    public function checkAndSendVerificationEmail(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->hasVerifiedEmail()) {
            return response()->json(['message' => 'Already verified']);
        }

        $activeCode = \Illuminate\Support\Facades\DB::table('email_verification_codes')
            ->where('email', $user->email)
            ->where('expires_at', '>', now())
            ->first();

        if (!$activeCode) {
            $user->sendEmailVerificationNotification();
            return response()->json(['message' => 'Email sent']);
        }

        return response()->json(['message' => 'Active code exists']);
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate(['email' => 'required|email']);
        
        $user = \App\Models\User::where('email', $request->email)->first();
        
        if (!$user) {
            // Return success anyway to prevent email enumeration
            return response()->json(['message' => 'passwords.sent']);
        }

        $code = str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        \Illuminate\Support\Facades\DB::table('password_reset_tokens')->updateOrInsert(
            ['email' => $request->email],
            [
                'token' => \Illuminate\Support\Facades\Hash::make($code),
                'created_at' => now()
            ]
        );

        $locale = $request->header('Accept-Language', 'en');
        // Extract basic locale (e.g., 'hr-HR' -> 'hr')
        $locale = substr($locale, 0, 2);
        if (!in_array($locale, ['en', 'hr'])) {
            $locale = 'en';
        }

        \Illuminate\Support\Facades\Mail::to($request->email)->send(
            new \App\Mail\ResetPasswordMail($code, $user->name, $locale)
        );

        return response()->json(['message' => 'passwords.sent']);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $request->validate([
            'token' => 'required',
            'email' => 'required|email',
            'password' => 'required|min:6',
        ]);

        $resetToken = \Illuminate\Support\Facades\DB::table('password_reset_tokens')
                        ->where('email', $request->email)
                        ->first();

        if (!$resetToken || !\Illuminate\Support\Facades\Hash::check($request->token, $resetToken->token)) {
            return response()->json(['message' => 'passwords.token'], 422);
        }

        if (\Carbon\Carbon::parse($resetToken->created_at)->addMinutes(15)->isPast()) {
            return response()->json(['message' => 'passwords.token'], 422);
        }

        $user = \App\Models\User::where('email', $request->email)->first();
        if (!$user) {
            return response()->json(['message' => 'passwords.user'], 422);
        }

        $user->forceFill([
            'password' => \Illuminate\Support\Facades\Hash::make($request->password)
        ])->setRememberToken(\Illuminate\Support\Str::random(60));
        
        $user->save();

        \Illuminate\Support\Facades\DB::table('password_reset_tokens')->where('email', $request->email)->delete();

        return response()->json(['message' => 'passwords.reset']);
    }
}
