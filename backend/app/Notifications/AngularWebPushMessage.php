<?php

namespace App\Notifications;

use NotificationChannels\WebPush\WebPushMessage;

class AngularWebPushMessage extends WebPushMessage
{
    public function toArray(): array
    {
        return [
            'notification' => parent::toArray(),
            'data' => [
                'onActionClick' => ['default' => ['operation' => 'navigateLastFocusedOrOpen', 'url' => '/']],
                'type' => 'push_event'
            ]
        ];
    }
}
