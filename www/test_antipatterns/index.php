<?php
// if agent is wpt, artificial slowdown
if( strpos( $_SERVER['HTTP_USER_AGENT'], "PTST" ) > 0 ){
	sleep(3);
}
?>

<!DOCTYPE html>
<html>

<head>
	<meta http-equiv="content-type" content="text/html; charset=utf-8" />
	<title>The Metric Times. Your source of performance antipattern test pages since 2022! WebPageTest's Performance AntiPattern Test Page</title>
	<meta name="Description" content="WebPageTest Recipe Testing Page" />
	<!-- <meta name="viewport" content="width=device-width" /> -->
	<link href="https://fonts.googleapis.com/css2?family=Roboto" rel="stylesheet">
	<link rel="stylesheet" href="site.css">
	<script src="site.js"></script>
	<script src="site2.js"></script>
	<script src="site3.js" defer></script>
	<script src="https://code.jquery.com/jquery-2.0.0.js" crossorigin="anonymous"></script>
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

		<div id="gencontent"></div>



		<script>
			setTimeout(function(){
			jQuery("#holder").html("<h3>We give up! Several stories will rotate in this carousel because we must include them all on the homepage. <a href=\"#\">Full Story</a><h3> </p>");
			}, 1000);

			jQuery("gencontent").html('<h1>HTML Ipsum Presents</h1><p><strong>Pellentesque habitant morbi tristique</strong> senectus et netus et malesuada fames ac turpis egestas. Vestibulum tortor quam, feugiat vitae, ultricies eget, tempor sit amet, ante. Donec eu libero sit amet quam egestas semper. <em>Aenean ultricies mi vitae est.</em> <img src="serviceworkers.jpg?cachebreak" importance="low" alt=""> Mauris placerat eleifend leo. Quisque sit amet est et sapien ullamcorper pharetra. Vestibulum erat wisi, condimentum sed, <code>commodo vitae</code>, ornare sit amet, wisi. Aenean fermentum, elit eget tincidunt condimentum, eros ipsum rutrum orci, sagittis tempus lacus enim ac dui. <a href="#">Donec non enim</a> in turpis pulvinar facilisis. Ut felis.</p><h2>Header Level 2</h2><ol><li>Lorem ipsum dolor sit amet, consectetuer adipiscing elit.</li><li>Aliquam tincidunt mauris eu risus.</li></ol><blockquote><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus magna. Cras in mi at felis aliquet congue. Ut a est eget ligula molestie gravida. Curabitur massa. Donec eleifend, libero at sagittis mollis, tellus est malesuada tellus, at luctus turpis elit sit amet quam. Vivamus pretium ornare est.</p></blockquote><h3>Header Level 3</h3><ul><li>Lorem ipsum dolor sit amet, consectetuer adipiscing elit.</li><li>Aliquam tincidunt mauris eu risus.</li></ul><pre><code>#header h1 a {display: block;width: 300px;height: 80px;}</code></pre>');
		</script>


	


</body>

</html>