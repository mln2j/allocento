<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{{ __('emails.verify_title', [], $locale) }}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 40px 0; color: #0f172a; }
        .container { max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(15, 23, 42, 0.05); }
        .header { background-color: #10B981; padding: 30px 20px; text-align: center; }
        .header img { height: 32px; margin-bottom: 12px; }
        .header h1 { margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
        .dev-banner { background-color: #fee2e2; color: #ef4444; text-align: center; font-weight: 700; padding: 12px; font-size: 13px; letter-spacing: 0.5px; border-bottom: 1px solid #fecaca; }
        .content { padding: 30px; text-align: center; }
        .content p { font-size: 16px; line-height: 1.5; color: #475569; margin-top: 0; margin-bottom: 24px; }
        .code-box { background-color: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 20px; font-size: 32px; font-weight: 800; letter-spacing: 10px; color: #10B981; margin-bottom: 24px; font-family: monospace; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="https://allocento.komsiluk.org/logo/white-logo.svg" alt="Allocento Logo" />
            <h1>{{ __('emails.verify_title', [], $locale) }}</h1>
        </div>
        @if(config('app.env') === 'local')
            <div class="dev-banner">DEVELOPMENT ENVIRONMENT - TEST EMAIL</div>
        @endif
        <div class="content">
            <p>{{ __('emails.verify_greeting', ['name' => $userName], $locale) }}</p>
            <p>{{ __('emails.verify_body', [], $locale) }}</p>
            
            <div class="code-box">{{ $code }}</div>
            
            <p style="font-size: 14px;">{{ __('emails.verify_expire', [], $locale) }}</p>
        </div>
        <div class="footer">
            &copy; {{ date('Y') }} Allocento. {{ __('emails.all_rights_reserved', [], $locale) }}
        </div>
    </div>
</body>
</html>
