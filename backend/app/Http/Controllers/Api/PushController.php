<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class PushController extends Controller
{
    public function vapidPublicKey()
    {
        return response()->json([
            'public_key' => config('webpush.vapid.public_key')
        ]);
    }

    public function subscribe(Request $request)
    {
        $request->validate([
            'endpoint' => 'required|string',
            'keys.auth' => 'required|string',
            'keys.p256dh' => 'required|string'
        ]);

        $request->user()->updatePushSubscription(
            $request->endpoint,
            $request->keys['p256dh'],
            $request->keys['auth']
        );

        return response()->json(['message' => 'Subscription successful.']);
    }

    public function unsubscribe(Request $request)
    {
        $request->validate([
            'endpoint' => 'required|string'
        ]);

        $request->user()->deletePushSubscription($request->endpoint);

        return response()->json(['message' => 'Unsubscribed successfully.']);
    }

    public function test(Request $request)
    {
        $request->user()->notify(new \App\Notifications\TestPushNotification());

        return response()->json(['message' => 'Test notification sent!']);
    }
}
