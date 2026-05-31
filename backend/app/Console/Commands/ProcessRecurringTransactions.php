<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\RecurringTemplate;
use App\Models\User;
use App\Services\TransactionService;
use Carbon\Carbon;

class ProcessRecurringTransactions extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'transactions:process-recurring';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Process and generate transactions from active recurring templates';

    public function __construct(private readonly TransactionService $transactionService)
    {
        parent::__construct();
    }

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting processing of recurring transactions...');

        $today = Carbon::today();
        $templates = RecurringTemplate::where('is_active', true)->get();
        $processedCount = 0;

        foreach ($templates as $template) {
            if ($this->shouldRunToday($template, $today)) {
                $user = User::find($template->created_by_user_id);
                if (!$user) {
                    $this->warn("User not found for template ID: {$template->id}");
                    continue;
                }

                $this->info("Processing template: {$template->name} for account ID: {$template->account_id}");

                $payload = [
                    'type' => $template->type,
                    'amount' => $template->amount,
                    'date' => $today->toDateTimeString(),
                    'description' => $template->description ?? "Recurring: {$template->name}",
                    'category_id' => $template->category_id,
                    'tags' => $template->tags,
                    'is_recurring' => true,
                    'recurring_rule' => [
                        'template_id' => $template->id,
                        'frequency' => $template->frequency,
                    ],
                ];

                $this->transactionService->createForAccount($user, $template->account_id, $payload);
                $processedCount++;
            }
        }

        $this->info("Completed! Processed {$processedCount} recurring transaction(s).");
    }

    private function shouldRunToday(RecurringTemplate $template, Carbon $today): bool
    {
        switch ($template->frequency) {
            case 'daily':
                return true;

            case 'weekly':
                // Runs on the same day of week as it was created
                return $today->dayOfWeek === Carbon::parse($template->created_at)->dayOfWeek;

            case 'monthly':
                $targetDay = $template->day_of_month ?? 1;
                // If today is the target day of the month, or if target day exceeds month days and today is the last day
                if ($today->day === $targetDay) {
                    return true;
                }
                if ($targetDay > $today->daysInMonth && $today->day === $today->daysInMonth) {
                    return true;
                }
                return false;

            case 'yearly':
                $createdAt = Carbon::parse($template->created_at);
                return $today->month === $createdAt->month && $today->day === $createdAt->day;

            default:
                return false;
        }
    }
}
