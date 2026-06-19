<?php

namespace App\Notifications;

use NotificationChannels\WebPush\WebPushMessage;

class AngularWebPushMessage extends WebPushMessage
{
    public function toArray(): array
    {
        return [
            'notification' => parent::toArray()
        ];
    }
}
