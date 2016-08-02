
function addJKNavigation(selector, selectedHandler) {
    $(document).keydown(function (e) {
        var JKey = 74;
        var KKey = 75;
        if (e.keyCode != JKey && e.keyCode != KKey) {
            return;
        }
        var elements = $(selector);
        var active = $(selector + '.jkActive');
        var curPos = elements.index(active);

        var newActive = undefined;
        if (curPos < 0) {
            newActive = elements.first();
        } else if (e.keyCode == JKey && curPos < (elements.length -1)) {
            newActive = elements.eq(curPos + 1);
        } else if (e.keyCode == KKey && curPos > 0) {
            newActive = elements.eq(curPos - 1);
        }

        if (newActive !== undefined) {
            if (active.length > 0) {
                active.removeClass('jkActive');
            }
            newActive.addClass('jkActive');
            if (typeof selectedHandler == "function") {
                selectedHandler(newActive);
            } else {
                $('html, body').animate({scrollTop: newActive.offset().top + 'px'}, 'fast');
            }
        }
    });
}
