/*
 * Embedded Timeline creates a special Timeline Pane that can be embedded in an iframe
 * All the page needs is a div with the id "main"
 */
 WebInspector.initializeEmbeddedTimeline = function() {
    this.timelineManager = new WebInspector.TimelineManager();
    this.shortcutsScreen = new WebInspector.ShortcutsScreen();
    this.console = new WebInspector.ConsoleModel();
    this.networkManager = new WebInspector.NetworkManager();
    this.resourceTreeModel = new WebInspector.ResourceTreeModel(this.networkManager);
    this.debuggerModel = new WebInspector.DebuggerModel();
    this.inspectorView = new WebInspector.InspectorView();
    this.drawer = new WebInspector.Drawer();

    this.timelinePanel = new WebInspector.TimelinePanel();
    //this.timelinePanel.show(); 
    this.timelinePanel._isShowing = true;
    this.timelinePanel._overviewPane._frameOverview = new WebInspector.TimelineFrameOverview(this.timelinePanel._model);

    this._frameController = new WebInspector.TimelineFrameController(this.timelinePanel._model, this.timelinePanel._overviewPane, this.timelinePanel._presentationModel);
}

/**
 * @constructor
 * @extends {WebInspector.Object}
 */
WebInspector.TimelineEmbedded = function() { }

WebInspector.TimelineEmbedded.prototype =  {
    show: function() 
    {
    //insert the Timeline in the DOM
        var mainDiv = document.getElementById("main-no-status-bar");
        var mainPanelsDiv = document.createElement("div");
        mainPanelsDiv.id = "main-panels"
        mainDiv.appendChild(mainPanelsDiv)
        var timelineDiv = WebInspector.timelinePanel.element;
        //WebKit doesn't want you to embed inspector elements in a page so they identify elements that came from the inspector because they have
        //a __view proerty and override the appendChild method...
        //FIXME: is is bad practice to modify private properties outside of their class. However, at this time there are no methods to change __view
        var __view = timelineDiv.__view;
        timelineDiv.__view = null;
        timelineDiv.addStyleClass("visible");
        mainPanelsDiv.appendChild(timelineDiv);
        timelineDiv.__view = __view;
        //why doesn't this work?
        //WebInspector.View._originalAppendChild.call(mainPanelsDiv, timelineDiv);

        //because this isn't running inside of a fully fledged inspector, some of the methods that set all of the panels styles aren't called
        WebInspector.timelinePanel.splitView._restoreSidebarWidth()
        WebInspector.timelinePanel.wasShown();
    },



    /**
    * @param {string} url
    * @param {number} delay
    */
    loadFromUrl: function(url, delay)
    {
        if(arguments.length == 1)
            delay = 1000;
        var xhr = new XMLHttpRequest();
        xhr.open("GET", url, false);
        xhr.send(null);
        if(xhr.status == 200) {
            var data = JSON.parse(xhr.responseText);
            WebInspector.timelinePanel._model.reset();
            WebInspector.timelinePanel._model._loadNextChunk(data, 1);
        }
        //I guess the frames take a while to load in so if you try to redraw the canvas too soon
        //it will only draw some of the frames
        //1000ms second was found to be sufficient to load fairly long records (~15s)
        setTimeout(this._reloadPanels, delay);
    },

    

    _reloadPanels: function()
    {
        //An annoying hack required because the timeline needs to re-switch to the Events view but
        //it can only switch to the events view if it isn't currently in it
        WebInspector.timelinePanel._overviewPane.setMode("Memory");
        WebInspector.timelinePanel._overviewPane.setMode("Events");
    }
}

var pageLoaded = function() {
    WebInspector.initializeEmbeddedTimeline();
    WebInspector.timelineEmbedded = new WebInspector.TimelineEmbedded();
    WebInspector.timelineEmbedded.show();
    WebInspector.timelineEmbedded.loadFromUrl(getJSONUrl());
}

window.addEventListener("DOMContentLoaded", pageLoaded, false);

function getJSONUrl()
{
  var name = "url".replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
  var regex = new RegExp("[\\?&]" + name + "=([^&#]*)");
  var results = regex.exec(window.location.search);
  if(results == null)
    return "";
  else
    return decodeURIComponent(results[1].replace(/\+/g, " "));
}