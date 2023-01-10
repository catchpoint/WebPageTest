// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.

let wptStorage = window.localStorage || {};

function htmlEntities(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function ValidateInput(form, remainingRuns) {
  if (
    (form.url.value == "" || form.url.value == "Enter a Website URL") &&
    form.script.value == "" &&
    (form["bulkurls"] == undefined || form.bulkurls.value == "") &&
    (form["bulkfile"] == undefined || form.bulkfile.value == "")
  ) {
    alert("Please enter an URL to test.");
    form.url.focus();
    return false;
  }

  if (form.url.value == "Enter a Website URL") form.url.value = "";

  if (form["runs"]) {
    var runs = form.runs.value;
    if (runs < 1 || runs > maxRuns) {
      alert("Please select a number of runs between 1 and " + maxRuns + ".");
      form.runs.focus();
      return false;
    }
    if (remainingRuns && runs > remainingRuns) {
      alert("You don't have enough remaining runs. Please Upgrade.");
      form.runs.focus();
      return false;
    }
  }
  if (remainingRuns && remainingRuns < 3) {
    alert("You don't have enough remaining runs. Please Upgrade.");
    form.runs.focus();
    return false;
  }

  var date = new Date();
  date.setTime(date.getTime() + 730 * 24 * 60 * 60 * 1000);
  var expires = "; expires=" + date.toGMTString();
  var options = 0;
  if (form["private"]) {
    if (form.private.checked) options = 1;
  }
  if (form["viewFirst"] && form.viewFirst.checked) options = options | 2;
  document.cookie = "testOptions=" + options + expires + "; path=/";
  if (form["runs"]) {
    document.cookie = "runs=" + runs + expires + "; path=/";
  }

  // save out the selected location and connection information
  try {
    document.cookie = "cfg=" + $("#connection").val() + expires + "; path=/";
    document.cookie = "u=" + $("#bwUp").val() + expires + "; path=/";
    document.cookie = "d=" + $("#bwDown").val() + expires + "; path=/";
    document.cookie = "l=" + $("#latency").val() + expires + "; path=/";
    document.cookie = "p=" + $("#plr").val() + expires + "; path=/";
  } catch (error) {}

  SaveSettings();

  return true;
}

/*
    Do any populating of the input form based on the loaded location information
*/
(function ($) {
  // enable tooltips
  $("#DOMElement").tooltip({ position: "top center", offset: [-5, 0] });

  // Capture tab characters in the script input field
  $("#enter-script").keydown(function (e) {
    var $this, end, start;
    if (e.keyCode === 9) {
      start = this.selectionStart;
      end = this.selectionEnd;
      $this = $(this);
      $this.val(
        $this.val().substring(0, start) + "\t" + $this.val().substring(end)
      );
      this.selectionStart = this.selectionEnd = start + 1;
      return false;
    }
  });

  // handle when the selection changes for the location
  $("#location").change(function () {
    LocationChanged();
  });
  $("#location2").change(function () {
    $("#location").val($("#location2").val());
    LocationChanged();
  });

  $("#browser").change(function () {
    BrowserChanged();
  });

  $("#connection").change(function () {
    ConnectionChanged();
  });
  if (window.locations) {
    RestoreSettings();
  }
})(jQuery);

function RestoreSettings() {
  if (wptStorage["testTimeline"] != undefined)
    $("#timeline").prop("checked", wptStorage["testTimeline"]);
  if (wptStorage["testLoc"] != undefined)
    $("#location").val(wptStorage["testLoc"]);

  LocationChanged();
}

function SaveSettings() {
  wptStorage["testTimeline"] = $("#timeline").is(":checked");
}

/*
    Populate the different browser options for a given location
*/
function LocationChanged() {
  $("#current-location").text($("#location option:selected").text());
  let loc = $("#location").val();
  $("#location2").val(loc);
  wptStorage["testLoc"] = loc;

  let marker = locations[loc]["marker"];
  try {
    marker.setIcon("/assets/images/map_green.png");
  } catch (err) {}
  try {
    selectedMarker.setIcon("/assets/images/map_red.png");
  } catch (err) {}
  selectedMarker = marker;

  let defaultConfig = locations[loc]["default"];
  if (defaultConfig == undefined) defaultConfig = locations[loc]["1"];
  let defaultBrowser = locations[defaultConfig]["browser"];

  let groups = ["Desktop", "Mobile", "Tablet"];
  let browsers = {};
  let has_chrome = false;
  // build the list of browsers for this location
  for (var key in locations[loc]) {
    // only care about the integer indexes
    if (!isNaN(key)) {
      let config = locations[loc][key];
      let browser = locations[config]["browser"];
      let group = "Desktop";
      if (locations[config]["browser_group"]) {
        group = locations[config]["browser_group"];
      }
      if (browser != undefined) {
        if (browser == "Chrome") {
          has_chrome = true;
        }
        // see if we already know about this browser
        let browserKey = browser.replace(" ", "");
        if (!browsers[group]) {
          browsers[group] = {};
        }
        browsers[group][browserKey] = browser;
      }
    }
  }

  // Add the emulated Chrome devices
  if (has_chrome && "mobileDevices" in window && mobileDevices) {
    group = "Chrome Device Emulation";
    groups.push(group);
    for (let deviceId in mobileDevices) {
      let browser = mobileDevices[deviceId]["label"];
      let browserKey = "Chrome;" + deviceId.replace(" ", "");
      if (!browsers[group]) {
        browsers[group] = {};
      }
      browsers[group][browserKey] = browser;
    }
  }

  // fill in the browser list, selecting the default one
  browserHtml = "";
  for (let group of groups) {
    if (browsers[group]) {
      browserHtml += '<optgroup label="' + htmlEntities(group) + '">';
      for (let key in browsers[group]) {
        let browser = browsers[group][key];
        let selected = "";
        if (browser == defaultBrowser) selected = " selected";
        let display = browser;
        browserHtml +=
          '<option value="' +
          htmlEntities(key) +
          '"' +
          selected +
          ">" +
          htmlEntities(display) +
          "</option>";
      }
      browserHtml += "</optgroup>";
    }
  }
  $("#browser").html(browserHtml);

  if (wptStorage["testBrowser"] != undefined)
    $("#browser").val(wptStorage["testBrowser"]);

  BrowserChanged();
}

/*
    Populate the various connection types that are available
*/
function BrowserChanged() {
  let loc = $("#location").val();
  let selectedBrowser = $("#browser").val();
  let defaultConfig = locations[loc]["default"];
  let selectedConfig;
  wptStorage["testBrowser"] = selectedBrowser;
  let deviceID = null;
  let parts = selectedBrowser.split(";");
  if (parts.length > 1) {
    selectedBrowser = parts[0];
    deviceID = parts[1];
  }

  let connections = [];

  // build the list of connections for this location/browser
  for (let key in locations[loc]) {
    // only care about the integer indexes
    if (!isNaN(key)) {
      let base_config = locations[loc][key];
      let config = base_config;
      if (deviceID) {
        config += ";" + deviceID;
      }
      let browser = locations[base_config]["browser"].replace(" ", "");
      if (browser == selectedBrowser) {
        if (locations[base_config]["connectivity"] != undefined) {
          connections[config] = {
            label: locations[base_config]["connectivity"],
          };
          if (base_config == defaultConfig) selectedConfig = config;
        } else {
          for (let conn in connectivity) {
            if (
              connectivity[conn]["hidden"] == undefined ||
              !connectivity[conn]["hidden"]
            ) {
              if (selectedConfig == undefined)
                selectedConfig = config + "." + conn;
              connections[config + "." + conn] = {
                label: connectivity[conn]["label"],
              };
            }
          }

          connections[config + ".custom"] = { label: "Custom" };
          if (selectedConfig == undefined) selectedConfig = config + ".custom";
        }
      }
    }
  }

  // if the default configuration couldn't be selected, pick the first one
  if (selectedConfig == undefined) {
    for (let config in connections) {
      selectedConfig = config;
      break;
    }
  }

  // build the actual list
  connectionHtml = "";
  let lastGroup = undefined;
  for (let config in connections) {
    let selected = "";
    if (config == selectedConfig) selected = " selected";
    if (
      connections[config]["group"] != undefined &&
      connections[config]["group"] != lastGroup
    ) {
      if (lastGroup != undefined) connectionHtml += "</optgroup>";
      if (connections[config]["group"].length) {
        lastGroup = connections[config]["group"];
        connectionHtml +=
          '<optgroup label="' +
          htmlEntities(connections[config]["group"]) +
          '">';
      } else lastGroup = undefined;
    }
    connectionHtml +=
      '<option value="' +
      htmlEntities(config) +
      '"' +
      selected +
      ">" +
      htmlEntities(connections[config]["label"]) +
      "</option>";
  }
  $("#connection").html(connectionHtml);

  if (wptStorage["testConnection"] != undefined) {
    let connection = wptStorage["testConnection"];
    try {
      $("#connection option:contains(" + connection + ")").each(function () {
        if ($(this).text() == connection) {
          $(this).attr("selected", "selected");
        }
      });
    } catch (e) {}
  }

  ConnectionChanged();
}

/*
    Populate the specifics of the connection information
*/
function ConnectionChanged() {
  var conn = $("#connection").val();
  wptStorage["testConnection"] = $("#connection option:selected").text();
  if (conn != undefined && conn.length) {
    var parts = conn.split(".");
    var config = parts[0].split(";")[0];
    var connection = parts[1];
    var setSpeed = true;

    var backlog = locations[config]["backlog"] || 0;

    var up = locations[config]["up"] / 1000;
    var down = locations[config]["down"] / 1000;
    var latency = locations[config]["latency"];
    var plr = 0;
    if (connection != undefined && connection.length) {
      if (connectivity[connection] != undefined) {
        up = connectivity[connection]["bwOut"] / 1000;
        down = connectivity[connection]["bwIn"] / 1000;
        latency = connectivity[connection]["latency"];
        if (connectivity[connection]["plr"] != undefined)
          plr = connectivity[connection]["plr"];
      } else {
        setSpeed = false;
      }
    }

    if (setSpeed) {
      $("#bwDown").val(down);
      $("#bwUp").val(up);
      $("#latency").val(latency);
      $("#plr").val(plr);
    }

    // enable/disable the fields as necessary
    if (connection == "custom") {
      $("#bwTable").removeClass("hidden");
    } else {
      $("#bwTable").addClass("hidden");
    }

    $("#backlog").text(backlog);
    if (backlog < 5)
      $("#pending_tests")
        .removeClass("backlogWarn , backlogHigh")
        .addClass("hidden");
    else if (backlog < 20)
      $("#pending_tests")
        .removeClass("backlogHigh , hidden")
        .addClass("backlogWarn");
    else
      $("#pending_tests")
        .removeClass("backlogWarn , hidden")
        .addClass("backlogHigh");

    UpdateSettingsSummary();
  }
}

/*
    Update the summary text with the current test settings
*/
function UpdateSettingsSummary() {
  var summary = "";

  var runs = $("#number_of_tests").val();
  summary += runs;
  if (runs == 1) summary += " run";
  else summary += " runs";

  if ($("#viewFirst").attr("checked")) summary += ", First View only";

  var conn = $("#connection option:selected").text();
  if (conn != undefined)
    summary += ", " + conn.replace(/\((.)*\)/, "") + " connection";

  $("#settings_summary").text(summary);
}

/*
    Show the multiple-location selection dialog
*/
function OpenMultipleLocations() {
  document.getElementById("multiple-location-dialog").style.display = "block";
}

/*
    Close the multiple-location selection dialog.
*/
function CloseMultipleLocations() {
  document.getElementById("multiple-location-dialog").style.display = "none";
}

/*
    Pop up the location selection dialog
*/
var map;
var selectedMarker;
function SelectLocation() {
  $("#location-dialog").modal({ opacity: 80 });
  $("#location2").val($("#location").val());

  var script = document.createElement("script");
  var src =
    "https://maps.google.com/maps/api/js?v=3.1&sensor=false&callback=InitializeMap";
  if (window.mapsApiKey !== undefined) {
    src += "&key=" + window.mapsApiKey;
  }
  script.src = src;
  document.body.appendChild(script);

  return false;
}

function InitializeMap() {
  var myLatlng = new google.maps.LatLng(15, 17);
  var myOptions = {
    zoom: 2,
    center: myLatlng,
    mapTypeControl: false,
    navigationControl: true,
    navigationControlOptions: {
      style: google.maps.NavigationControlStyle.SMALL,
    },
    mapTypeId: google.maps.MapTypeId.ROADMAP,
  };
  var map = new google.maps.Map(document.getElementById("map"), myOptions);

  var currentLoc = $("#location").val();

  var locList = [];
  for (var loc in locations) {
    if (
      locations[loc]["lat"] != undefined &&
      locations[loc]["lng"] != undefined
    ) {
      locList.push(loc);
    }
  }
  locList.reverse();

  for (var index in locList) {
    var loc = locList[index];
    var pos = new google.maps.LatLng(
      locations[loc]["lat"],
      locations[loc]["lng"]
    );
    var marker = new google.maps.Marker({
      position: pos,
      title: locations[loc]["label"],
      icon: "/assets/images/map_red.png",
      map: map,
    });

    if (loc == currentLoc) {
      marker.setIcon("/assets/images/map_green.png");
      selectedMarker = marker;
    }

    locations[loc]["marker"] = marker;

    AttachClickEvent(marker, loc);
  }
}

function AttachClickEvent(marker, loc) {
  google.maps.event.addListener(marker, "click", function () {
    $("#location").val(loc);
    LocationChanged();
  });
}
