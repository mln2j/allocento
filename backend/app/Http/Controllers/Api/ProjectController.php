<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Services\ProjectService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;

class ProjectController extends Controller
{
    public function __construct(
        private readonly ProjectService $projectService
    ) {
    }

    public function index()
    {
        $user = Auth::user();

        $projects = Project::query()
            ->where('organization_id', $user->organization_id)
            ->get();

        return response()->json($projects);
    }

    public function store(Request $request)
    {
        $user = Auth::user();

        $data = $request->validate([
            'name'           => ['required', 'string', 'max:255'],
            'planned_budget' => ['nullable', 'numeric'],
            'start_date'     => ['nullable', 'date'],
            'end_date'       => ['nullable', 'date'],
        ]);


        $data['organization_id'] = $user->organization_id;

        $project = Project::create($data);

        return response()->json($project, Response::HTTP_CREATED);
    }

    public function summary(int $id)
    {
        $user = Auth::user();

        $summary = $this->projectService->getSummaryForUserProject($user, $id);

        if (! $summary) {
            return response()->json(['message' => 'Not found'], Response::HTTP_NOT_FOUND);
        }

        return response()->json($summary);
    }
}
