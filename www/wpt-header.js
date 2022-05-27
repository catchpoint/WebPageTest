/*
WebPageTest Global Header.
*/
class WptHeader extends HTMLElement {
    constructor() {
        super();
        this._init = this._init.bind(this);
        this._observer = new MutationObserver(this._init);
    }
    connectedCallback() {
        if (this.children.length) {
            this._init();
        }
        this._observer.observe(this, { childList: true });
    }
    _init() {
        this.menubtn = this.querySelector(".wptheader_menubtn");
        this.menu = this.menubtn.closest("details");
        this.details = this.querySelectorAll("nav details");
        let that = this;
        this.headerLayoutChange = getComputedStyle(document.documentElement).getPropertyValue('--wpt-header-layoutchange');
        this.layoutMedia = matchMedia('(min-width: ' + this.headerLayoutChange + ')');
        this.layoutMedia.addEventListener("change", function(e) {
            that.updateMenuAttrs(e);
        });
        that.updateMenuAttrs(this.layoutMedia);
        this.menuHovers();
    }
    menuHovers() {
        let that = this;
        this.details.forEach(function(detail) {
            detail.addEventListener("mouseenter", function() {
                if (that.menuDisplay() === "none") {
                    this.open = true;
                }
            });
            detail.addEventListener("mouseleave", function() {
                if (that.menuDisplay() === "none") {
                    this.open = false;
                }
            });
            detail.addEventListener("click", function(e) {
                if (e.target.closest("summary")) {
                    if (that.menuDisplay() === "none") {
                        that.details.forEach(function(otherdeet) {
                            if (otherdeet !== e.target) {
                                otherdeet.open = false;
                            }
                        });
                    }
                }
            });
        });
    }
    menuDisplay() {
        return getComputedStyle(this.menubtn).display;
    }
    updateMenuAttrs(e) {
        if (e.matches) {
            this.menu.open = true;
        } else {
            this.menu.open = false;
        }

    }

}

if ('customElements' in window) {
    customElements.define('wpt-header', WptHeader);
}