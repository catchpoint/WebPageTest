/*********************************************************************************
  Test State
**********************************************************************************/
var PAGE_LOCAL = "/local.html";
var PATH_LOCAL = chrome.extension.getURL(PAGE_LOCAL);
var testUrls;
var runs = document.getElementById('runs').value;
var currentTest = 0;

/*********************************************************************************
  Manage the UI state
**********************************************************************************/
function UI_RunTest(){
  runs = document.getElementById('runs').value;
  var urls = document.getElementById('urls').value.split("\n");
  testUrls = [];
  currentTest = 0;
  for (i = 0; i < urls.length; i++) {
    var url = urls[i];
    if (url.length)
      testUrls.push(url);
  }
  if (testUrls.length) {
    // switch the UI
    document.getElementById('results').value = '';
    document.getElementById('new_test').style.display = 'none';
    document.getElementById('test_status').style.display = '';
    RunNextTest();
  }
};

function RunNextTest() {
  if (currentTest < testUrls.length) {
    wpt.RunTest({'url':testUrls[currentTest++], 
                 'runs':runs}, TestDone);
  }
}

function TestDone(result) {
  var output = document.getElementById('results');
  if (result != undefined && result['results'] != undefined) {
    for (i = 0; i < result.results.length; i++) {
      var out = CSVEncode(result.url) + ',';
      if (result.results[i]['loadTime'] != undefined)
        out += CSVEncode(result.results[i]['loadTime']);
      if (result.results[i]['error'] != undefined)
        out += ',' + CSVEncode(result.results[i]['error']);
      output.value += out + "\n";
    }
  }
  RunNextTest();
}

function UI_NewTest() {
  document.getElementById('test_status').style.display = 'none';
  document.getElementById('new_test').style.display = '';
}

function SetTestStatus(status) {
  document.getElementById('status_text').innerHTML = status;
  console.log(status);
  document.title = status;
};

document.getElementById('submit').addEventListener('click', UI_RunTest, false);
document.getElementById('run_new_test').addEventListener('click', UI_NewTest, false);

/*********************************************************************************
  Utility routines
**********************************************************************************/
function CSVEncode(str) {
  str = String(str);
  if (str.indexOf('"') != -1 || str.indexOf(',') != -1) {
    str = '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
};
