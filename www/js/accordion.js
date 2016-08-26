
function AccordionHandler(testId, testRun) {
    this.testId = testId;
    this.testRun = testRun;
    this.onSnippetLoaded = this._onSnippetLoaded;
}

AccordionHandler.prototype.connect = function() {
    $(".accordion_opener").click(function(event) {
        this.toggleAccordion(event.target);
    }.bind(this));
    addJKNavigation(".accordion_opener", function(selected) {
        this.toggleAccordion(selected, true, function() {
            $('html, body').animate({scrollTop: selected.offset().top + 'px'}, 'fast');;
        });
    }.bind(this));
    this._initBackToTop();
    this._initSpaceToggle();
};

AccordionHandler.prototype.toggleAccordion = function(targetNode, forceOpen, onComplete) {
    targetNode = $(targetNode);
    if (!targetNode.hasClass("accordion_opener")) {
        return; // avoid dealing with non-accordions
    }
    $('.accordion_opener.jkActive').removeClass("jkActive");
    targetNode.addClass("jkActive");

    if ((forceOpen === true && targetNode.hasClass("accordion_opened")) ||
        (forceOpen === false && targetNode.hasClass("accordion_closed"))) {
        if (typeof onComplete == "function") {
            onComplete();
        }
        return;
    }

    var snippetType = targetNode.data("snippettype");
    var stepNumber = targetNode.data("step");
    var isCached = targetNode.data("cachedrun");
    var snippetNodeSelector = targetNode.data("snippetnode");
    var snippetNode = $(snippetNodeSelector);
    if (snippetNode.data("loaded") !== "true") {
        var args = {
            'snippet': snippetType,
            'test' : this.testId,
            'run' : this.testRun,
            'cached' : isCached,
            'step': stepNumber
        };
        targetNode.addClass("accordion_loading");
        snippetNode.load("/details_snippet.php", args, function() {
            this.onSnippetLoaded(targetNode, snippetNode, onComplete);
        }.bind(this));
    } else {
        this._animateAccordion(targetNode, snippetNode, onComplete);
    }
};

AccordionHandler.prototype._onSnippetLoaded = function(targetNode, snippetNode, onComplete) {
    snippetNode.data("loaded", "true");
    targetNode.removeClass("accordion_loading");

    // trigger animation when all images in the snippet loaded
    var images = snippetNode.find("img");
    var noOfImages = images.length;
    if (noOfImages > 0) {
        var noLoaded = 0;
        images.on('load', function(){
            noLoaded++;
            if(noOfImages === noLoaded) {
                this._animateAccordion(targetNode, snippetNode, onComplete);
            }
        }.bind(this));
    } else {
        this._animateAccordion(targetNode, snippetNode, onComplete);
    }
};

AccordionHandler.prototype._animateAccordion = function(openerNode, snippetNode, onComplete) {
    openerNode.toggleClass("accordion_opened");
    openerNode.toggleClass("accordion_closed");
    snippetNode.slideToggle(400, onComplete);
    var initFunction = openerNode.data("jsinit");
    if (initFunction) {
        window[initFunction](snippetNode);
    }
};

AccordionHandler.prototype._initBackToTop = function () {
    $(window).scroll(function() {
        var button = $("#back_to_top");
        if ($(this).scrollTop() > 300) {
            button.fadeIn();
        } else {
            button.fadeOut();
        }
    });
    $("#back_to_top").click(function() {
        $('body,html').animate({ scrollTop: 0 }, 'fast');
        return false;
    });
};

AccordionHandler.prototype._initSpaceToggle = function() {
    $(document).keydown(function (e) {
        if (e.keyCode != 32 || e.target != document.body) {
            return;
        }
        e.preventDefault();
        var active = $(".jkActive");
        if (active.length) {
            this.toggleAccordion(active, undefined, function() {
                $('html, body').animate({scrollTop: active.offset().top + 'px'}, 'fast');
            });
        }
    }.bind(this));
};

AccordionHandler.prototype.handleHash = function() {
    var hash = window.location.hash;
    var targetNode = $(hash);
    if (targetNode.length) {
        this.toggleAccordion(targetNode, true, function() {
            $('html, body').animate({scrollTop: targetNode.offset().top + 'px'}, 'fast');
        });
    }
};