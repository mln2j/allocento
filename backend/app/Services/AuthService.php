<?php

namespace App\Services;

use App\Repositories\Contracts\UserRepositoryInterface;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

use App\Models\Workspace;
use Illuminate\Support\Facades\DB;

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
        $user = DB::transaction(function () use ($data) {
            $user = $this->userRepository->create($data);

            // Auto-create personal workspace
            $workspace = Workspace::create([
                'name' => 'Osobno',
                'type' => 'personal',
                'currency' => 'EUR',
            ]);

            // User is the owner of this workspace
            $workspace->users()->attach($user->id, ['role' => 'owner']);

            // Set favorite workspace
            $user->update(['favorite_workspace_id' => $workspace->id]);

            return $user;
        });

        $token = $user->createToken('allocento')->plainTextToken;

        return [
            'token' => $token,
            'user' => $user->load(['favoriteWorkspace', 'workspaces']),
        ];
    }
}
