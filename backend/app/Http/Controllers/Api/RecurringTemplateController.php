<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\RecurringTemplate;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Http\JsonResponse;

class RecurringTemplateController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $workspace = $request->get('_workspace');
        $templates = RecurringTemplate::where('workspace_id', $workspace->id)
            ->with(['account', 'category', 'createdBy'])
            ->get();

        return response()->json($templates);
    }

    public function store(Request $request): JsonResponse
    {
        $workspace = $request->get('_workspace');

        $validated = $request->validate([
            'account_id' => ['required', 'exists:accounts,id'],
            'category_id' => ['nullable', 'exists:categories,id'],
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', 'in:income,expense'],
            'amount' => ['required', 'numeric'],
            'description' => ['nullable', 'string'],
            'tags' => ['nullable', 'array'],
            'frequency' => ['required', 'in:daily,weekly,monthly,yearly'],
            'day_of_month' => ['nullable', 'integer', 'min:1', 'max:31'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        // Verify account belongs to workspace
        $account = $workspace->accounts()->where('accounts.id', $validated['account_id'])->first();
        if (!$account) {
            return response()->json(['error' => 'Account not found or access denied in active workspace.'], 403);
        }

        $template = RecurringTemplate::create(array_merge($validated, [
            'workspace_id' => $workspace->id,
            'created_by_user_id' => $request->user()->id,
            'is_active' => $validated['is_active'] ?? true,
        ]));

        return response()->json($template, 201);
    }

    public function show(Request $request, $id, $templateId): JsonResponse
    {
        $workspace = $request->get('_workspace');
        $template = RecurringTemplate::where('workspace_id', $workspace->id)
            ->where('id', $templateId)
            ->first();

        if (!$template) {
            return response()->json(['error' => 'Recurring template not found or access denied.'], 404);
        }

        return response()->json($template);
    }

    public function update(Request $request, $id, $templateId): JsonResponse
    {
        $workspace = $request->get('_workspace');
        $template = RecurringTemplate::where('workspace_id', $workspace->id)
            ->where('id', $templateId)
            ->first();

        if (!$template) {
            return response()->json(['error' => 'Recurring template not found or access denied.'], 404);
        }

        $validated = $request->validate([
            'account_id' => ['sometimes', 'required', 'exists:accounts,id'],
            'category_id' => ['sometimes', 'nullable', 'exists:categories,id'],
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'type' => ['sometimes', 'required', 'in:income,expense'],
            'amount' => ['sometimes', 'required', 'numeric'],
            'description' => ['sometimes', 'nullable', 'string'],
            'tags' => ['sometimes', 'nullable', 'array'],
            'frequency' => ['sometimes', 'required', 'in:daily,weekly,monthly,yearly'],
            'day_of_month' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:31'],
            'is_active' => ['sometimes', 'required', 'boolean'],
        ]);

        if (isset($validated['account_id'])) {
            $account = $workspace->accounts()->where('accounts.id', $validated['account_id'])->first();
            if (!$account) {
                return response()->json(['error' => 'Account not found or access denied in active workspace.'], 403);
            }
        }

        $template->update($validated);

        return response()->json($template);
    }

    public function destroy(Request $request, $id, $templateId): JsonResponse
    {
        $workspace = $request->get('_workspace');
        $template = RecurringTemplate::where('workspace_id', $workspace->id)
            ->where('id', $templateId)
            ->first();

        if (!$template) {
            return response()->json(['error' => 'Recurring template not found or access denied.'], 404);
        }

        $template->delete();

        return response()->json(null, Response::HTTP_NO_CONTENT);
    }
}
