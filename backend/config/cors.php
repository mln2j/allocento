<?php

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['*'],
    'allowed_origins' => [
        'http://localhost:4200',

        'http://mlendvaj.myddns.me',
        'https://mlendvaj.myddns.me',

        'http://allocento.komsiluk.org',
        'https://allocento.komsiluk.org',
    ],
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => false,
];
