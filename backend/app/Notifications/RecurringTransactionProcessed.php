<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use NotificationChannels\WebPush\WebPushMessage;
use NotificationChannels\WebPush\WebPushChannel;

class RecurringTransactionProcessed extends Notification implements ShouldQueue
{
    use Queueable;

    protected $transaction;

    /**
     * Create a new notification instance.
     */
    public function __construct($transaction)
    {
        $this->transaction = $transaction;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return [WebPushChannel::class];
    }

    /**
     * Get the web push representation of the notification.
     */
    public function toWebPush($notifiable, $notification)
    {
        return (new AngularWebPushMessage)
            ->title(__('notifications.recurring_transaction_title'))
            ->body(__('notifications.recurring_transaction_body', [
                'description' => $this->transaction->description ?? 'N/A',
                'amount' => $this->transaction->amount . ' ' . ($this->transaction->account->currency ?? 'EUR'),
            ]))
            ->icon('/icons/icon-192x192.png')
            ->data(['url' => '/transactions'])
            ->badge('/icons/icon-72x72.png');
    }
}
