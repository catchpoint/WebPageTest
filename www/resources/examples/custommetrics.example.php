<?php
$EXAMPLES = [
    [
        'title' => 'Default',
        'example' => function () {
            $data = [
                'custom' => [
                    'Colordepth',
                    'Dpi',
                    'Images',
                    'Resolution',
                    'generated-content-percent',
                    'generated-content-size',
                ],
                'Colordepth' => 24,
                'Dpi' => '{"dppx":1,"dpcm":37.79527559055118,"dpi":96}',
                'Images' => '[{"url":"https://www.phpied.com/images/covers/ruar.jpg","width":100,"height":131,"naturalWidth":381,"naturalHeight":499},{"url":"https://www.phpied.com/images/covers/jsp.jpg","width":100,"height":131,"naturalWidth":381,"naturalHeight":499},{"url":"https://www.phpied.com/images/covers/js4php.jpg","width":100,"height":130,"naturalWidth":385,"naturalHeight":499},{"url":"https://www.phpied.com/images/covers/oojs.jpg","width":100,"height":123,"naturalWidth":406,"naturalHeight":500},{"url":"https://www.phpied.com/images/covers/wp.jpg","width":100,"height":131,"naturalWidth":381,"naturalHeight":499}]',
                'Resolution' => '{"absolute":{"height":1200,"width":1920},"available":{"height":1200,"width":1920}}',
                'generated-content-percent' => 21,
                'generated-content-size' => 123,
            ];
            return view('partials.custommetrics', [
                'data' => $data,
            ]);
        }
    ]
];
