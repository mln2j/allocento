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
        $workspace = null;

        if ($workspaceId) {
            $workspace = $user->workspaces()->where('workspaces.id', $workspaceId)->first();
        }

        if (!$workspace) {
            $workspaceId = $user->favorite_workspace_id;
            if ($workspaceId) {
                $workspace = $user->workspaces()->where('workspaces.id', $workspaceId)->first();
            }
        }

        if (!$workspace) {
            $workspace = $user->workspaces()->first();
            if ($workspace) {
                $user->update(['favorite_workspace_id' => $workspace->id]);
            } else {
                return response()->json(['error' => 'No workspace context available.'], 400);
            }
        }

        // Merge workspace into the request attributes so controllers can read it easily
        $request->merge(['_workspace' => $workspace]);
        $request->attributes->set('workspace', $workspace);

        return $next($request);
    }
}
