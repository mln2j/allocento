<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use NotificationChannels\WebPush\WebPushChannel;

class WorkspaceInvitationReceived extends Notification implements ShouldQueue
{
    use Queueable;

    protected $workspaceName;

    /**
     * Create a new notification instance.
     */
    public function __construct(string $workspaceName)
    {
        $this->workspaceName = $workspaceName;
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
            ->title(__('notifications.invitation_title'))
            ->body(__('notifications.invitation_body', ['workspace' => $this->workspaceName]))
            ->icon('/icons/icon-192x192.png')
            ->data(['url' => '/dashboard'])
            ->badge('/icons/icon-72x72.png');
    }
}
