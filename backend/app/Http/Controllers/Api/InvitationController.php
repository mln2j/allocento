<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invitation;
use App\Models\Workspace;
use App\Services\InvitationService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class InvitationController extends Controller
{
    protected $invitationService;

    public function __construct(InvitationService $invitationService)
    {
        $this->invitationService = $invitationService;
    }

    public function invite(Request $request, Workspace $workspace): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
            'role' => ['sometimes', 'in:manager,member'],
        ]);

        $result = $this->invitationService->invite($request->user(), $workspace, $validated);

        if (is_string($result)) {
            if ($result === 'Unauthorized' || $result === 'Managers cannot invite other managers.') {
                return response()->json(['message' => $result], 403);
            }
            if ($result === 'User is already a member.') {
                return response()->json(['message' => $result], 422);
            }
        }

        if (is_array($result) && isset($result['error'])) {
            return response()->json([
                'message' => $result['error'],
                'invitation' => $result['invitation']
            ], 422);
        }

        return response()->json([
            'message' => 'Invitation created successfully.',
            'invitation' => $result,
        ]);
    }

    public function pending(Request $request): JsonResponse
    {
        $invitations = $this->invitationService->getPending($request->user());
        return response()->json($invitations);
    }

    public function reject(Request $request, $token): JsonResponse
    {
        $result = $this->invitationService->reject($request->user(), $token);
        if (!$result) {
            return response()->json(['message' => 'Invitation not found.'], 404);
        }

        return response()->json(['message' => 'Invitation rejected.']);
    }

    public function accept(Request $request, $token): JsonResponse
    {
        $result = $this->invitationService->accept($request->user(), $token);

        if ($result === false) {
            return response()->json(['message' => 'Invitation not found.'], 404);
        }
        if ($result === 'Expired') {
            return response()->json(['message' => 'Invitation expired.'], 422);
        }
        if ($result === 'Workspace not found') {
            return response()->json(['message' => 'Workspace not found.'], 404);
        }

        return response()->json([
            'message' => "Successfully joined '{$result->name}'.",
            'workspace' => $result
        ]);
    }

    public function index(Request $request, Workspace $workspace): JsonResponse
    {
        $result = $this->invitationService->getForWorkspace($request->user(), $workspace);

        if ($result === false) {
            return response()->json(['message' => 'Unauthorized to view invitations for this workspace.'], 403);
        }

        return response()->json($result);
    }

    public function destroy(Request $request, Workspace $workspace, Invitation $invitation): JsonResponse
    {
        $result = $this->invitationService->destroyForWorkspace($request->user(), $workspace, $invitation);

        if ($result === 'Unauthorized') {
            return response()->json(['message' => 'Unauthorized to manage invitations for this workspace.'], 403);
        }
        if ($result === 'Not found') {
            return response()->json(['message' => 'Invitation not found in this workspace.'], 404);
        }

        return response()->json(['message' => 'Invitation revoked successfully.']);
    }
}
