<?php

namespace App\Services;

use App\Repositories\Contracts\UserRepositoryInterface;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

use App\Models\Workspace;
use Illuminate\Support\Facades\DB;

use Illuminate\Auth\Events\Registered;

class AuthService
{
    public function __construct(private UserRepositoryInterface $userRepository) {}

    public function login(string $email, string $password): array
    {
        $user = $this->userRepository->findByEmail($email);

        if (! $user || ! Hash::check($password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        $token = $user->createToken('allocento')->plainTextToken;

        // Auto-send verification email if user is not verified and doesn't have an active code
        if (!$user->hasVerifiedEmail()) {
            $activeCode = DB::table('email_verification_codes')
                ->where('email', $user->email)
                ->where('expires_at', '>', now())
                ->first();

            if (!$activeCode) {
                $user->sendEmailVerificationNotification();
            }
        }

        return [
            'token' => $token,
            'user' => $user->load(['favoriteWorkspace', 'workspaces']),
        ];
    }

    public function register(array $data): array
    {
        $user = $this->userRepository->create($data);

        // Auto-create personal workspace
        $personalWorkspace = Workspace::create([
            'name' => 'Personal',
            'type' => 'personal',
            'currency' => 'EUR',
            'enabled_features' => ['categories'],
        ]);
        $personalWorkspace->users()->attach($user->id, ['role' => 'owner']);

        // Okinemo Laravelov ugrađeni event (koji će automatski okrznuti naš custom email jer implementiramo MustVerifyEmail i prepisujemo metodu)
        event(new Registered($user));

        $token = $user->createToken('allocento')->plainTextToken;

        return [
            'token' => $token,
            'user' => $user->load(['favoriteWorkspace', 'workspaces']),
        ];
    }
}
