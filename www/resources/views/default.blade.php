<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>{{ $page_title ?? 'WebPageTest' }}</title>
    <x-favicons/>
    <x-fonts/>
</head>
<body>

    @yield('content')

</body>
</html>