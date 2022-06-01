<?php
// if agent is wpt, artificial slowdown
if( strpos( $_SERVER['HTTP_USER_AGENT'], "PTST" ) > 0 ){
	sleep(3);
}
if( !strpos( $_SERVER['REQUEST_URI'], "index.php" ) ){
	header("Location: index.php");
}
?>

<!DOCTYPE html>
<html>

<head>
	<meta http-equiv="content-type" content="text/html; charset=utf-8" />
	<title>The Metric Times. Your source of performance antipattern test pages since 2022! WebPageTest's Performance AntiPattern Test Page</title>
	<meta name="Description" content="WebPageTest Recipe Testing Page" />
	<!-- <meta name="viewport" content="width=device-width" /> -->
	<link href="https://fonts.googleapis.com/css2?family=Abril+Fatface&family=Roboto&family=Merriweather:wght@300;700" rel="stylesheet">
	<link rel="stylesheet" href="site.css">
	<script src="site.js"></script>
	<script src="site2.js"></script>
	<script src="site3.js" defer></script>
	<script src="https://code.jquery.com/jquery-2.0.0.js" crossorigin="anonymous"></script>
	<script src="http://example.com/this-will-fail.js"></script>
	<link rel="stylesheet" href="https://code.jquery.com/ui/1.13.0-rc.3/themes/smoothness/jquery-ui.css">
	<link rel="preload" href="foo/bar/baz.css" as="style">
	<link rel="apple-touch-icon" sizes="96x96" href="/images/favicon-96x96.png">
	<link rel="icon" type="image/png" sizes="96x96" href="/images/favicon-96x96.png">
	<link rel="icon" type="image/png" sizes="32x32" href="/images/favicon-32x32.png">
	<link rel="icon" type="image/png" sizes="16x16" href="/images/favicon-16x16.png">

</head>

<body>
	<script id="wptsnippet">(function(){ let wptframe = document.createElement("iframe"); wptframe.style.border = "none"; wptframe.style.width = "289px"; wptframe.style.height = "102px"; wptframe.loading = "lazy"; wptframe.src = "/embed.php?url=" + encodeURIComponent(location.href); document.querySelector("#wptsnippet").after(wptframe);}());</script>		<nav>

	<header>
		<script>
			var d = new Date();
			document.write('<p><time datetime="'+ [d.getFullYear(),d.getMonth(),d.getDate()].join("-") +'">'+ d.toLocaleDateString('en-us', { weekday:"long", year:"numeric", month:"short", day:"numeric"}) +'</time></p>');
		</script>
		<p class="logo">The Metric Times</p>
		<p class="logosub">Your source of performance antipattern test pages since 2022!</p>
		
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

			<img src="dog.jpg" loading="lazy">
			
		</section>

		<section class="headlines-secondary">
			<article>
			<h2>JavaScript Frameworks Forecast Imminent First Input Delay</h2>
			<img src="delays.jpg" alt="">
			</article>
			<article>
			<h2>Service Workers Respond as Requests Increasingly Mount</h2>
			<img src="serviceworkers.jpg" importance="low" alt="">
			</article>
		</section>

	</main>
		<marquee id="holder">

		</marquee>


		<div class="secondary">

			<section class="headline">
				<h1 id="react">This Text will be replaced with react text</h1>
				<p>Users are alarmed by increased webpage loading times, noting that helpful tools are "literally right here." <a href="#">Full Story</a></p>

				<img src="dog.jpg?again">
				
			</section>

			<section class="headlines-secondary">
				<article>
				<h2>Framework Developers Remind Users To Hydrate</h2>
				<img src="delays.jpg?again" alt="">
				</article>
				<article>
				<h2>Service Workers Handling Requests Beautifully</h2>
				<img src="serviceworkers.jpg?again" importance="low" alt="">
				</article>
			</section>

	</div>

		


		<script>
			setTimeout(function(){
			jQuery("#holder").html("<h3>We give up! Several stories will rotate in this carousel because we must include them all on the homepage. <a href=\"#\">Full Story</a><h3> </p>");
			}, 1000);
		</script>
		<script src="https://unpkg.com/react/umd/react.development.js"></script>
		<script src="https://unpkg.com/react-dom/umd/react-dom.development.js"></script>
		<script id="rendered-js">
		const root = ReactDOM.createRoot(document.getElementById('react'));
		root.render( /*#__PURE__*/React.createElement("span", null, "We Loaded ALL of React to Render This Heading!"));
		//# sourceURL=pen.js
		</script>


	


</body>

</html>