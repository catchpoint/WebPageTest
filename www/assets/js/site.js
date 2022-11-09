// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.
function wptLogout(redirectUrl) {
  document.body.style.cursor = "wait";
  var mydate = new Date();
  mydate.setTime(mydate.getTime() - 1);
  document.cookie =
    "google_email=; expires=" + mydate.toGMTString() + "; path=/;";
  document.cookie = "google_id=; expires=" + mydate.toGMTString() + "; path=/;";
  document.cookie =
    "google_association_handle=; expires=" + mydate.toGMTString() + "; path=/;";
  document.cookie =
    "page_before_google_oauth=; expires=" + mydate.toGMTString() + "; path=/;";
  document.cookie = "samlu=; expires=" + mydate.toGMTString() + "; path=/;";
  document.cookie = "o=; expires=" + mydate.toGMTString() + "; path=/;";
  window.localStorage.clear();
  if (redirectUrl) {
    window.location.replace(redirectUrl);
  } else {
    window.location.reload();
  }
}

/** Webpagetest-specific code */
(function ($) {
  // store the time zone offset in a cookie
  try {
    var tz_date = new Date();
    var tz_offset = -tz_date.getTimezoneOffset();
    tz_date.setTime(tz_date.getTime() + 730 * 24 * 60 * 60 * 1000);
    var tz_expires = "; expires=" + tz_date.toGMTString();
    document.cookie = "tzo=" + tz_offset + tz_expires + "; path=/";
  } catch (e) {}

  // display any dates on the page in local time
  try {
    $(".jsdate").each(function () {
      var js_date = $(this).attr("date") * 1000;
      if (js_date) {
        var d = new Date(js_date);
        $(this).text(d.toLocaleString());
      }
    });
  } catch (e) {}
})(jQuery);

(function ($) {
  $(document).ready(function () {
    // Advanced Settings toggle
    $("#advanced_settings").click(function () {
      $(this).toggleClass("extended");
      $("#" + $(this).attr("id") + "-container").toggleClass("hidden");
      $("#settings_summary_label").toggleClass("hidden");
      UpdateSettingsSummary();

      // store it in a cookie
      var date = new Date();
      date.setTime(date.getTime() + 730 * 24 * 60 * 60 * 1000);
      var expires = "; expires=" + date.toGMTString();
      var as = 1;
      if ($("#" + $(this).attr("id") + "-container").hasClass("hidden")) as = 0;
      document.cookie = "as=" + as + expires + "; path=/";

      return false;
    });

    // Advanced Settings toggle
    $("#script_in_results").click(function () {
      $(this).toggleClass("extended");
      $("#script_in_results-container").toggleClass("hidden");
      return false;
    });

    // jQuery UI Tabs
    $("#test_subbox-container").tabs();
    $("#test_subbox-container").on("tabsshow", async function (event, ui) {
      if (ui.tab.id === "ui-tab-advanced") {
        initCodeField("injectScript");
        initCodeField("customHeaders");
      }
      if (ui.tab.id === "ui-tab-custom-metrics") {
        initCodeField("custom");
      }
      if (ui.tab.id === "ui-tab-script") {
        initCodeField("enter_script");
      }
    });

    // Truncatable
    $(".truncate").truncate({ max_length: 100, more: "..." });
    $(".truncate-80").truncate({ max_length: 80, more: "..." });

    $(".grades > li").tooltip({
      bodyHandler: function () {
        var t = $(this);

        if (t.hasClass("keep_alive_enabled")) {
          return "Click the grade to see the requests that did not have keep-alives enabled";
        } else if (t.hasClass("security")) {
          return "Click the grade to see the full security score detailed report";
        } else if (t.hasClass("compress_text")) {
          return "Click the grade to see the requests that should be gzipped but were not";
        } else if (t.hasClass("compress_images")) {
          return "Click the grade to see a list of the images that can be better compressed";
        } else if (t.hasClass("progressive_jpeg")) {
          return "Click the grade to see a list of the JPEG images that should be converted to progressive";
        } else if (t.hasClass("cache_static_content")) {
          return "Click the grade to see the requests that should be cached if possible";
        } else if (t.hasClass("combine_js_css_files")) {
          return "Click the grade to see a list of the javascript and css files that should be combined";
        } else if (t.hasClass("use_of_cdn")) {
          return "Click the grade to see the requests that should be served from a CDN if you have a distributed user base";
        } else if (t.hasClass("first_byte_time")) {
          return "Click the grade to see information about the target First Byte Time";
        } else if (t.hasClass("lighthouse")) {
          return "Click the score to see the full Lighthouse Progressive Web App report";
        }

        return false;
      },
      showURL: false,
      delay: 0,
      fixPNG: true,
    });

    var testBoxContainer = $("#test_box-container");
    var startTestContainer = $("#start_test-container");

    if (testBoxContainer.size() != 0 && startTestContainer.size != 0) {
      var tolerance = {
        top: 50,
        bottom: 250,
      };
      function positionButton() {
        var windowScroll = $(window).scrollTop();
        var constraints = {
          top: testBoxContainer.offset().top,
          bottom: testBoxContainer.offset().top + testBoxContainer.height(),
        };

        if (
          windowScroll > constraints.top - tolerance.top &&
          windowScroll < constraints.bottom - tolerance.bottom
        ) {
          // Page is in adjustment range
          var newPadding = windowScroll - constraints.top + tolerance.top;
          startTestContainer.css("margin-top", newPadding);
        } else if (windowScroll <= constraints.top - tolerance.top) {
          // Page is scrolled above the adjustment range; place button in default position
          startTestContainer.css("margin-top", 0);
        }
      }
      positionButton();

      $(window).bind("scroll resize", positionButton);
    }
  });
})(jQuery);

// This code handles editing test labels
(function ($) {
  $(document).ready(function () {
    $(".editLabel").click(function (event) {
      event.preventDefault();

      var element_clicked = $(this),
        testguid = element_clicked.attr("data-test-guid"),
        labelNode = $("#label_" + testguid),
        currentLabelText = element_clicked.attr("data-current-label"),
        inputNode;

      inputNode = $(
        '<input id="label_input_' +
          testguid +
          '" type="text" value="' +
          currentLabelText +
          '" />'
      );
      labelNode.replaceWith(inputNode);
      element_clicked.hide();
      var saveNode = $('<a href="#">Save</a>');
      saveNode.insertAfter(inputNode);

      // Save the new label
      saveNode.click(function () {
        inputNode = $("#label_input_" + testguid);
        newLabel = inputNode.val();

        var request = $.ajax({
          url: "/modifytest.php",
          type: "POST",
          data: { testID: testguid, label: newLabel },
          dataType: "html",
        });

        request.done(function (msg) {
          inputNode.replaceWith(labelNode.html(newLabel));
          element_clicked.attr("data-current-label", newLabel);
          saveNode.remove();
          element_clicked.show();
        });
      });
    });
  });
})(jQuery);

// Store test info in the test history if it exists
(function () {
  if (window.indexedDB && typeof wptTestInfo !== "undefined") {
    let open = window.indexedDB.open("webpagetest", 1);
    open.onupgradeneeded = function () {
      let db = open.result;
      let store = db.createObjectStore("history", { keyPath: "id" });
      store.createIndex("url", "url", { unique: false });
      store.createIndex("location", "location", { unique: false });
      store.createIndex("label", "label", { unique: false });
      store.createIndex("created", "created", { unique: false });
    };
    open.onsuccess = function () {
      try {
        let store = open.result
          .transaction("history", "readwrite")
          .objectStore("history");
        store.put(wptTestInfo);
      } catch (err) {
        // Delete the database and force it to recreate
        indexedDB.deleteDatabase("webpagetest");
      }
    };
  }
})();

window.codeFlasks = {};
/**
 * Handle file picks.
 * Relies on the global `window.codeFlasks` for interoperability with the
 * code highlighting.
 *
 * @param {string} source Element ID of the file picker
 * @param {string} dest Element ID of the input where file content goes
 */
function initFileReader(source, dest) {
  const uploadInput = document.getElementById(source);
  if (uploadInput) {
    uploadInput.addEventListener(
      "change",
      () => {
        const file = uploadInput.files[0];
        const reader = new FileReader();
        reader.addEventListener(
          "load",
          () => {
            if (dest in window.codeFlasks) {
              // the textarea was replaced by a codeflask input
              window.codeFlasks[dest].updateCode(reader.result);
            } else {
              document.getElementById(dest).value = reader.result;
            }
          },
          false
        );
        if (file) {
          reader.readAsText(file);
        }
      },
      false
    );
  }
}

/**
 * Initialize fields for code highlighting (using codeflask)
 * Relies on the global `window.codeFlasks` for interoperability with the
 * file pickers.
 *
 * @param {string} source Element ID of the textarea
 */
async function initCodeField(source, language = "js") {
  if (window.codeFlasks[source]) {
    return; // already initialized
  }
  // load Flask
  const { default: CodeFlask } = await import("/assets/js/codeflask.module.js");
  const originalTextarea = document.getElementById(source);
  // editor container
  const codeEl = document.createElement("div");
  codeEl.classList.add("codeflask-container");
  originalTextarea.parentNode.insertBefore(codeEl, originalTextarea);
  // switch textarea to a hidden input
  const hidden = document.createElement("input");
  hidden.type = "hidden";
  hidden.id = source;
  hidden.name = originalTextarea.name;
  originalTextarea.parentNode.replaceChild(hidden, originalTextarea);
  // go!
  const codeArea = new CodeFlask(codeEl, {
    language,
  });
  codeArea.onUpdate((code) => (hidden.value = code));
  window.codeFlasks[source] = codeArea;
}

async function loadPrism() {
  if (window.Prism) {
    return window.Prism;
  }
  const ss = document.createElement("link");
  ss.rel = "stylesheet";
  ss.type = "text/css";
  ss.href = "/assets/css/vendor/prism.css";
  document.head.appendChild(ss);

  // todo: find a Prism distro that is a proper module
  await import("/assets/js/prism.js");
  return window.Prism;
}
