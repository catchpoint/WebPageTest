

<!DOCTYPE html>
<html>

<head>
	<meta http-equiv="content-type" content="text/html; charset=utf-8" />
	<title>WebPageTest's Performance AntiPattern Test Page</title>
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
	
	<header>
		<script>
			var d = new Date();
			document.write('<p><time datetime="'+ [d.getFullYear(),d.getMonth(),d.getDate()].join("-") +'">'+ d.toLocaleDateString('en-us', { weekday:"long", year:"numeric", month:"short", day:"numeric"}) +'</time></p>');
		</script>
		<p class="logo">The Metric Times</p>
		<p class="logosub">Your source of performance antipattern test pages since 2022!</p>
		<a class="wptlogo" href="/"><img src="/images/wpt-logo.svg" alt="WebPageTest, by Catchpoint"/></a>
		<nav>
			<ul>
				<li><a href="#">These</a></li>
				<li><a href="#">Are Not</a></li>
				<li><a href="#">Real Links</a></li>
				<li><a href="#">That Go Anywhere</a></li>
				<li><a href="#">They Are</a></li>
				<li><a href="#">Just Here</a></li>
				<li><a href="#">For Style</a></li>
			</ul>
		</nav>
	</header>
	<main>

		<section class="headline">
			<h1>Pageload Delays Triple when Developers Forget to Check WebPageTest</h1>
			<p>Users are alarmed by increased webpage loading times, noting that helpful tools are "literally right here." <a href="#">Full Story</a></p>

			<img src="https://picsum.photos/700/300" loading="lazy">
			
		</section>

		<section class="headlines-secondary">
			<article>
			<h2>JavaScript Frameworks Forecast Imminent First Input Delay</h2>
			<img src="https://picsum.photos/400/200" alt="">
			</article>
			<article>
			<h2>Service Workers Respond as Requests Increasingly Mount</h2>
			<img src="https://picsum.photos/400/200" importance="low" alt="">
			</article>
		</section>

	</main>
		<marquee id="holder">

		</marquee>



		<script>
			document.querySelector('#holder').innerHTML = "<h3>We give up! Several stories will rotate in this carousel because we must include them all on the homepage. <a href=\"#\">Full Story</a><h3> </p>";
		</script>


	


</body>

</html>