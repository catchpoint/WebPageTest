<div class="home_feature">
    <div class="home_feature_hed_contain">
		<div class="home_feature_containslides">
			<div class="home_feature_hed home_feature_hed-main">
				<div class="home_feature_hed_text">
					<h1 class="attention">Test. Optimize. Repeat!</h1>
					<p>Instantly test your site’s speed, usability, and resilience in real <b>browsers</b>, <b>devices</b>, and <b>locations</b> around the&nbsp;world. </p>

				</div>
				<div class="home_feature_hed_visual">
					<img src="/images/wpt_home_featureimg.jpg" fetchpriority="high" width="1414" height="843" alt="screenshot of wpt results page">
				</div>
			</div>
			<div class="home_feature_hed home_feature_hed-pro">
				<div class="home_feature_hed_text">
					<h1 class="attention"><span class="home_feature_hed_text_leadin">Say hello to </span> <img class="home_feature_hed_text_logo" width="105" height="14" src="/images/wpt-logo-pro.svg" alt="WebPageTest Pro"></h1>
								<p>All of the WebPageTest features you already love, <span class="home_feature_hed_text_line">plus <b>API Access</b> &amp; <b>No-Code Experiments!</b></span></p>
					<a class="pill" href="/signup" style="
					padding: .9em 1.5em;
				">View Plans &amp; Learn More &gt;&gt;</a>
				</div>
				<div class="home_feature_hed_visual">
						<video width="1152" height="720" playsinline="" id="intro" poster="/images/pro-intro.jpg" preload="none">
							<source src="/images/pro-intro-1152.mp4" media="(min-width: 800px)">
							<source src="/images/pro-intro-480.mp4">
							<!--<track default="" kind="captions" srclang="en" src="/images/pro-intro.vtt">-->
						</video>
						<button class="play" id="playbtn">Play/Pause Video</button>
				</div>
			</div>
		</div>


        

       

    </div>

    </div>

    <script>
        setInterval(() => {
            if( !document.body.classList.contains("playing") && matchMedia("(prefers-reduced-motion: no-preference)").matches ){
                document.body.classList.toggle("feature-pro");
            }
        },8000);


        (function(){
				var intro = document.querySelector("video");
				var playbtn = document.querySelector(".play");
				
				function activate(){
					intro.controls = true;
					document.body.classList.add("playing");
				}
				function deactivate(){
					intro.controls = false;
					intro.pause();
					document.body.classList.remove("playing");
				}
				
				intro.addEventListener( "play", function(e){
					activate();
					playbtn.classList.add("active");
				});
				intro.addEventListener( "pause", function(e){
					playbtn.classList.remove("active");
				});
				intro.addEventListener( "ended", function(e){
					this.controls = false;
					deactivate();
					document.body.classList.remove("playing");
				});
				playbtn.addEventListener( "click", function(e){
					e.preventDefault();
					if(intro.paused){
						intro.play();
					} else {
						intro.pause();
					}
				});
				
				document.body.addEventListener("mousedown",function( e ){
					if( this.classList.contains("playing") && e.target !== intro && e.target !== playbtn  ){
						e.preventDefault();
						deactivate();
					}
				});
				document.body.addEventListener("keydown",function( e ){
					if( this.classList.contains("playing") && e.keyCode === 27 ){
						e.preventDefault();
						deactivate();
					}
				});
			}());

    </script>

    