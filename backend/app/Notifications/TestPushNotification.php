<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use NotificationChannels\WebPush\WebPushChannel;
use App\Notifications\AngularWebPushMessage;

class TestPushNotification extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * Create a new notification instance.
     */
    public function __construct()
    {
        //
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
            ->title(__('notifications.test_push_title'))
            ->body(__('notifications.test_push_body'))
            ->icon('/icons/icon-192x192.png')
            ->data(['url' => '/settings'])
            ->badge('/icons/icon-72x72.png');
    }
}
