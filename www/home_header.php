<div class="home_feature">
    <div class="home_feature_hed_contain">
        <div class="home_feature_containslides">
            <?php

            if (!is_null($request_context->getUser()) && $request_context->getUser()->isPaid() && !isset($req_cc) ) {
                ?>
                <div class="home_feature_hed home_feature_hed-pro home_feature_hed-pro-loggedin">
                    <div class="home_feature_hed_text">
                        <h1 class="attention"><span class="home_feature_hed_text_leadin">Welcome to </span> <img class="home_feature_hed_text_logo" width="105" height="14" src="/assets/images/wpt-logo-pro.svg" alt="WebPageTest Pro"></h1>
                        <p><b>You're ready to go!</b> Enjoy premium locations, bulk runs, test priority, our API, & No-Code Experiments!</p>
                    </div>
                </div>

            <?php } else { ?>
                <div class="home_feature_hed home_feature_hed-main">
                    <div class="home_feature_hed_text">
                        <h1 class="attention">Test. Experiment. Improve!</h1>
                        <p><strong>WebPageTest.</strong> <span class="home_feature_hed_highlighter">The gold standard in web performance testing. </span></p>

                    </div>
                    <div class="home_feature_hed_visual">
                        <img src="/assets/images/wpt_home_featureimg.jpg" width="1414" height="843" alt="screenshot of wpt results page">
                    </div>
                </div>
                <div class="home_feature_hed home_feature_hed-lfwp">
                    <div class="home_feature_hed_text">
                        <h1 class="attention"><span class="home_feature_hed_text_leadin">Lightning-Fast </span> <strong>Web Performance</strong></h1>
                        <p><b class="flag">Online Course</b>Learn to analyze performance, fix issues, and deliver fast websites from the start.</p>
                        <a class="pill" href="/learn/lightning-fast-web-performance/" style="padding: .9em 1.5em;">Free! Start Course Now &gt;&gt;</a>
                    </div>
                    <div class="home_feature_hed_visual">
                        <img src="/assets/images/wpt_home_lfwp_featureimg.jpg" width="1414" height="843" alt="screenshot of wpt results page">
                    </div>
                    
                </div>
                <div class="home_feature_hed home_feature_hed-cc">
                    <div class="home_feature_hed_text">
                        <h1 class="attention"><span class="home_feature_hed_text_leadin">Introducing <b>Carbon Control <span class="flag">Experimental</span></b></span> </h1>
                        <p><b>New in WebPageTest!</b> Measure your site's carbon footprint and run No-Code Experiments to find ways to improve. </p>
                        
                    </div>
                    <div class="home_feature_hed_visual">
                        <img src="/assets/images/wpt_home_featureimg-cc.jpg" width="1414" height="843" alt="screenshot of wpt results page">
                    </div>
                </div>
                <div class="home_feature_hed home_feature_hed-pro">
                    <div class="home_feature_hed_text">
                        <h1 class="attention"><span class="home_feature_hed_text_leadin">Say hello to </span> <img class="home_feature_hed_text_logo" width="105" height="14" src="/assets/images/wpt-logo-pro.svg" alt="WebPageTest Pro"></h1>
                        <p>All of the WebPageTest features you already love, <span class="home_feature_hed_text_line">plus <b>API Access</b> &amp; <b>No-Code Experiments!</b></span></p>
                        <a class="pill" href="/signup" style="padding: .9em 1.5em;">View Plans &amp; Learn More &gt;&gt;</a>
                    </div>
                    <div class="home_feature_hed_visual">
                        <video width="1152" height="720" playsinline="" id="intro" poster="/assets/images/pro-intro.jpg" preload="none">
                            <source src="/assets/images/pro-intro-1152.mp4" media="(min-width: 800px)">
                            <source src="/assets/images/pro-intro-480.mp4">
                            <!--<track default="" kind="captions" srclang="en" src="/assets/images/pro-intro.vtt">-->
                        </video>
                        <button class="play" id="playbtn">Play/Pause Video</button>
                    </div>
                </div>
                
            <?php } ?>
        </div>





        </div>
    </div>

    <script>
        let featureSlides = setInterval(() => {
            if( document.body.querySelector(".home_feature_hed-main") && !document.body.classList.contains("playing") && ( !document.activeElement || document.activeElement.tagName !== 'IFRAME' ) && matchMedia("(prefers-reduced-motion: no-preference)").matches ){
                if( document.body.classList.contains("feature-pro") ){
                    document.body.classList.remove("feature-pro");
                    document.body.classList.add("feature-lfwp");
                } else if( document.body.classList.contains("feature-lfwp") ){
                    document.body.classList.remove("feature-lfwp");
                    document.body.classList.add("feature-cc");
                } else if( document.body.classList.contains("feature-cc") ){
                    document.body.classList.remove("feature-cc");
                } else {
                    document.body.classList.add("feature-pro");
                }
                
            }
        },8000);

        <?php if (isset($req_cc)) {?>
            clearTimeout(featureSlides);
        <?php } ?>


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

    
