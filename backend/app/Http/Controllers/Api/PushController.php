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
        // Simuliramo transakciju
        $dummyTransaction = new \stdClass();
        $dummyTransaction->description = 'Testna Transakcija (Netflix)';
        $dummyTransaction->amount = 14.99;
        $dummyTransaction->account = new \stdClass();
        $dummyTransaction->account->currency = 'EUR';

        $request->user()->notify(new \App\Notifications\RecurringTransactionProcessed($dummyTransaction));

        return response()->json(['message' => 'Test notification sent!']);
    }
}
