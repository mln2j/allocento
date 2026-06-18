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

        return [
            'token' => $token,
            'user' => $user->load(['favoriteWorkspace', 'workspaces']),
        ];
    }

    public function register(array $data): array
    {
        $user = $this->userRepository->create($data);

        // Okinemo Laravelov ugrađeni event
        event(new Registered($user));

        // Eksplicitno šaljemo email (naš custom) da se ne oslanjamo na automatski listener koji možda nije aktivan
        $user->sendEmailVerificationNotification();

        $token = $user->createToken('allocento')->plainTextToken;

        return [
            'token' => $token,
            'user' => $user->load(['favoriteWorkspace', 'workspaces']),
        ];
    }
}
