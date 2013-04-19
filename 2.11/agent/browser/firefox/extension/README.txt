Firefox WPT driver extension
---------------------------
This extension provides basic page-level benchmarking into the browser.

Here is the flow of how this extension is used:
1. wptdriver starts Firefox with --load-extension to use this extension.
2. It has the extension ON by default.
3. The extension gets http://127.0.0.1/get_test?callback=MyCallback
4. If a test is queued, wptdriver responds with the JSON test data.
5. The extension runs the test.
6. The extension posts the result to http://127.0.0.1/test_result
7. wptdriver kills Firefox.
