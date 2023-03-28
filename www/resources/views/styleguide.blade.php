<!DOCTYPE html>
<html>

<head>
    @yield('style')
    <style>
        body {
            display: inherit !important
        }

        .styleguide-container h1 {
            padding: 1em;
            margin: inherit;
        }

        .styleguide-toc {
            padding: 1em;
        }

        .styleguide-toc ul {
            list-style: inherit;
            margin: inherit;
            padding: 1em;
        }

        .styleguide-partial .styleguide-example {
            padding: 1em;
        }
    </style>
    <title>
        <!--TITLE-->
    </title>
    <?php
    $body_class = $body_class ? ' class="' . $body_class . '"' : '';
    ?>
    <link rel="stylesheet" href="/assets/css/typography.css?v=<?php echo constant('VER_TYPOGRAPHY_CSS') ?>">
    <link rel="stylesheet" href="/assets/css/layout.css?v=<?php echo constant('VER_LAYOUT_CSS') ?>">
    <link rel="stylesheet" href="/assets/css/pagestyle2.css?v=<?php echo constant('VER_CSS') ?>">
</head>

<body {!!$body_class !!}>
    <div class="styleguide-container">
        <h1>
            <!--TITLE-->
        </h1>
        <div class="styleguide-example">
            <!--CONTENT-->
            @yield('content')
        </div>
        <div class="styleguide-toc">
            <!--TOC-->
        </div>
    </div>
</body>

</html>