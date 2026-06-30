<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\WorkspaceService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class WorkspaceController extends Controller
{
    protected $workspaceService;

    public function __construct(WorkspaceService $workspaceService)
    {
        $this->workspaceService = $workspaceService;
    }

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $workspaces = $this->workspaceService->getAllForUser($user->id);

        $workspaces->each(function ($workspace) {
            $workspace->users_count = $workspace->users()->count();
        });

        return response()->json($workspaces);
    }

    public function show(Request $request, $id): JsonResponse
    {
        $user = $request->user();
        $workspace = $user->workspaces()->with(['users', 'accounts'])->where('workspaces.id', $id)->first();

        if (!$workspace) {
            return response()->json(['error' => 'Workspace not found or access denied.'], 404);
        }

        return response()->json($workspace);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', 'in:personal,household,company'],
            'currency' => ['required', 'string', 'size:3'],
            'enabled_features' => ['nullable', 'array'],
            'enabled_features.*' => ['string', 'in:categories,reports'],
        ]);

        $workspace = $this->workspaceService->createWorkspace($validated, $request->user()->id);

        return response()->json($workspace, 201);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'type' => ['sometimes', 'required', 'in:personal,household,company'],
            'currency' => ['sometimes', 'required', 'string', 'size:3'],
            'enabled_features' => ['nullable', 'array'],
            'enabled_features.*' => ['string', 'in:categories,reports'],
        ]);

        $result = $this->workspaceService->updateWorkspace($request->user(), $id, $validated);

        if ($result === false) {
            return response()->json(['error' => 'Workspace not found or access denied.'], 404);
        }
        if ($result === 'Unauthorized') {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        return response()->json($result);
    }

    public function destroy(Request $request, $id): JsonResponse
    {
        $result = $this->workspaceService->deleteWorkspace($request->user(), $id);

        if ($result === false) {
            return response()->json(['error' => 'Workspace not found or access denied.'], 404);
        }
        if ($result === 'Only the owner can delete the workspace.') {
            return response()->json(['error' => $result], 403);
        }
        if ($result === 'Personal workspace cannot be deleted.') {
            return response()->json(['error' => $result], 400);
        }

        return response()->json(['message' => 'Workspace deleted successfully.']);
    }

    public function setFavorite(Request $request, $id): JsonResponse
    {
        $result = $this->workspaceService->setFavorite($request->user(), $id);

        if ($result === false) {
            return response()->json(['error' => 'Workspace not found or access denied.'], 404);
        }

        return response()->json(['message' => 'Favorite workspace updated.', 'user' => $result]);
    }

    public function shareAccount(Request $request, $id, $accountId): JsonResponse
    {
        $result = $this->workspaceService->shareAccount($request->user(), $id, $accountId);

        if ($result === 'Workspace not found' || $result === 'Account not found') {
            return response()->json(['error' => $result], 404);
        }
        if ($result === 'Unauthorized') {
            return response()->json(['error' => 'Only the owner or manager of the org/household can share this account.'], 403);
        }

        return response()->json(['message' => 'Account shared with workspace successfully.']);
    }

    public function unshareAccount(Request $request, $id, $accountId): JsonResponse
    {
        $result = $this->workspaceService->unshareAccount($request->user(), $id, $accountId);

        if ($result === 'Workspace not found' || $result === 'Account not found') {
            return response()->json(['error' => $result], 404);
        }
        if ($result === 'Unauthorized') {
            return response()->json(['error' => 'Only the owner or manager of the org/household can unshare this account.'], 403);
        }

        return response()->json(['message' => 'Account unshared from workspace successfully.']);
    }

    public function removeMember(Request $request, $id, $userId): JsonResponse
    {
        $result = $this->workspaceService->removeMember($request->user(), $id, $userId);

        if ($result === 'Workspace not found' || $result === 'Member not found') {
            return response()->json(['error' => $result], 404);
        }
        if ($result === 'Unauthorized') {
            return response()->json(['error' => 'You do not have permission to manage members.'], 403);
        }
        if ($result === 'Cannot remove owner') {
            return response()->json(['error' => 'Cannot remove the owner of the workspace.'], 400);
        }

        return response()->json(['message' => 'Member removed successfully.']);
    }

    public function updateMemberRole(Request $request, $id, $userId): JsonResponse
    {
        $validated = $request->validate([
            'role' => ['required', 'in:member,manager,owner']
        ]);

        $result = $this->workspaceService->updateMemberRole($request->user(), $id, $userId, $validated['role']);

        if ($result === 'Workspace not found' || $result === 'Member not found') {
            return response()->json(['error' => $result], 404);
        }
        if ($result === 'Unauthorized') {
            return response()->json(['error' => 'Only the owner can change member roles.'], 403);
        }
        if ($result === 'Cannot change owner role') {
            return response()->json(['error' => 'Cannot change the role of the owner.'], 400);
        }
        if ($result === 'transfer') {
            return response()->json(['message' => 'Ownership transferred successfully.']);
        }

        return response()->json(['message' => 'Member role updated successfully.']);
    }

    public function leave(Request $request, $id): JsonResponse
    {
        $result = $this->workspaceService->leaveWorkspace($request->user(), $id);

        if ($result === 'Workspace not found') {
            return response()->json(['error' => 'Workspace not found or access denied.'], 404);
        }
        if ($result === 'Owner cannot leave') {
            return response()->json(['error' => 'Owner cannot leave the workspace. Delete it instead or transfer ownership.'], 400);
        }

        return response()->json(['message' => 'Left workspace successfully.']);
    }
}
