<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use NotificationChannels\WebPush\WebPushChannel;
use App\Notifications\AngularWebPushMessage;

class SyncCompletedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    private int $count;

    /**
     * Create a new notification instance.
     */
    public function __construct(int $count)
    {
        $this->count = $count;
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
            ->title('Sinkronizacija završena')
            ->body("Uspješno sinkronizirano {$this->count} offline transakcija!")
            ->icon('/icons/icon-192x192.png')
            ->data(['url' => '/transactions'])
            ->badge('/icons/icon-72x72.png');
    }
}
