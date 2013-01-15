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
    var test = {'url':testUrls[currentTest++], 
                'runs':runs};
    chrome.extension.sendRequest({'msg':'RUN_TEST','test':test});
  }
}

/*********************************************************************************
  Messages from the background testing engine
**********************************************************************************/
chrome.extension.onRequest.addListener(function(request, sender, sendResponse){
  console.log('local: ' + request.msg);
  if (request.msg == 'TEST_COMPLETE') {
    var output = document.getElementById('results');
    if (request['result'] != undefined && request.result['results'] != undefined) {
      for (i = 0; i < request.result.results.length; i++) {
        var out = CSVEncode(request.result.url) + ',';
        if (request.result.results[i]['loadTime'] != undefined)
          out += CSVEncode(request.result.results[i]['loadTime']);
        if (request.result.results[i]['error'] != undefined)
          out += ',' + CSVEncode(request.result.results[i]['error']);
        output.value += out + "\n";
      }
    }
    setTimeout(RunNextTest(),1);
  }
});

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
