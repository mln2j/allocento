<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ResolveWorkspace
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if (!$user) {
            return $next($request);
        }

        $workspaceId = $request->header('X-Workspace-ID');

        if (!$workspaceId) {
            $workspaceId = $user->favorite_workspace_id;
        }

        if (!$workspaceId) {
            // If the user has no favorite workspace but has workspaces, set the first one as favorite
            $firstWorkspace = $user->workspaces()->first();
            if ($firstWorkspace) {
                $user->update(['favorite_workspace_id' => $firstWorkspace->id]);
                $workspaceId = $firstWorkspace->id;
            } else {
                return response()->json(['error' => 'No workspace context available.'], 400);
            }
        }

        // Verify the user actually has access to this workspace
        $workspace = $user->workspaces()->where('workspace_id', $workspaceId)->first();

        if (!$workspace) {
            return response()->json(['error' => 'Access denied to this workspace or workspace does not exist.'], 403);
        }

        // Merge workspace into the request attributes so controllers can read it easily
        $request->merge(['_workspace' => $workspace]);
        $request->attributes->set('workspace', $workspace);

        return $next($request);
    }
}
