

<!DOCTYPE html>
<html>

<head>
	<meta http-equiv="content-type" content="text/html; charset=utf-8" />
	<title>Test the recipes!</title>
	<meta name="Description" content="WebPageTest Recipe Testing Page" />
	<!-- <meta name="viewport" content="width=device-width" /> -->
    <link href="https://fonts.googleapis.com/css2?family=Roboto" rel="stylesheet">
    <link rel="stylesheet" href="site.css">
    <script src="site.js"></script>
    <script src="site2.js"></script>
    <script src="site3.js" defer></script>
    <script src="https://code.jquery.com/jquery-3.6.0.js" integrity="sha256-/xUj+3OJU5yExlq6GSYGSHk7tPXikynS7ogEvDej/m4=" crossorigin="anonymous"></script>
    <script src="https://example.com/this-will-fail.js"></script>
    <link rel="stylesheet" href="https://code.jquery.com/ui/1.13.0-rc.3/themes/smoothness/jquery-ui.css">
    <link rel="preload" href="foo/bar/baz.css" as="style">
</head>

<body>
	<div class="contain">
        <h1>WPT Recipe Testing Page</h1>

        <p>Start with some images to flag or not... This one is going to be LCP, and it's 3rd party plus no dimensions.</p>
        <img src="https://picsum.photos/500/500" alt="">
        <p>Here's an image that has loading=lazy but probably shouldn't.</p>
        <img src="https://picsum.photos/100/100" loading="lazy" alt="">

        <div id="holder">

        </div>

        <img src="https://picsum.photos/700/700" importance="low" alt="">


        <script>
            document.querySelector('#holder').innerHTML = "<p>Here's some generated content that takes a while to appear. Here's some generated content that takes a while to appear. Here's some generated content that takes a while to appear. Here's some generated content that takes a while to appear. Here's some generated content that takes a while to appear. Here's some generated content that takes a while to appear. Here's some generated content that takes a while to appear. Here's some generated content that takes a while to appear. Here's some generated content that takes a while to appear. Here's some generated content that takes a while to appear. Here's some generated content that takes a while to appear. Here's some generated content that takes a while to appear. Here's some generated content that takes a while to appear. Here's some generated content that takes a while to appear. Here's some generated content that takes a while to appear. </p>";
        </script>


        <p>Moving on.</p>
	</div>
</body>

</html>