@extends('default')

@section('style')
<style>
    del,
    .del {
        text-decoration: none;
        color: #b30000;
        background: #fadad7;
    }

    ins,
    .ins {
        background: #eaf2c2;
        color: #406619;
        text-decoration: none;
    }

    #diff-result a.del {
        color: #b30000;
    }

    #diff-result a.ins {
        color: #406619;
    }

    #delivered,
    #rendered {
        display: none;
    }

    pre {
        white-space: pre-wrap;
        font-family: Consolas, Monaco, Andale Mono, Ubuntu Mono, monospace;
        margin: 0;
    }

    #diff-result td a {
        text-decoration: none;
        color: #888;
        margin: 0 4px;
    }

    #result {
        overflow-x: auto;
    }

    #prettier {
        margin-bottom: 24px;
    }

    #diff-result .error {
        color: red;
        font-size: larger;
    }

    #diff-result {
        padding: 24px 0;
    }

    .results_header p {
        max-width: none;
    }

    .placeholder-row {
        background: aliceblue;
    }

    .placeholder-row button {
        width: 100%;
        height: 100%;
        background: transparent;
        border: 0;
        text-align: left;
        padding: 8px;
        font-style: italic;
        cursor: pointer;
    }
</style>
@endsection

@section('content')
<div class="results_main_contain">
    <div class="results_main">
        <div class="results_and_command">
            <div class="results_header">
                <h2>HTML Diff</h2>
                <p>A diff between the HTML delivered over the network <span class="del">(red lines)</span>
                    and the generated HTML <span class="ins">(green lines)</a>.</p>
            </div>
        </div>
        @if ($error_message)
        <div id="result" class="results_body error-banner">
            <div>{{ $error_message }}</div>
        </div>
        @else
        <label>
            <input type="checkbox" id="prettier">
            Prettify HTML before the diff
        </label>
        <div id="result" class="results_body @if ($error_message) error-banner @endif">
            <div class="overflow-container">
                <div id="diff-result">Loading the diff...</div>
            </div>
            <pre id="delivered">{{$delivered_html}}</pre>
            <pre id="rendered">{{$rendered_html}}</pre>
        </div>
        <script type="module">
            // setup inline web worker
            // more info: https://calendar.perfplanet.com/2022/get-off-the-main-thread-with-an-inline-web-worker-an-example/
            function diffWorkerImplementation() {
                importScripts(location.origin + '/assets/js/vendor/diff-5.1.0.min.js');
                onmessage = (e) => {
                    postMessage(Diff.diffLines(e.data.before, e.data.after));
                };
            }
            const diffWorker = new Worker(
                URL.createObjectURL(
                    new Blob(
                        [`(${diffWorkerImplementation.toString()})()`], {
                            type: 'text/javascript'
                        }
                    )
                )
            );
            // done setting up the inline web worker

            function showAll() {
                document.querySelectorAll('#diff-result tr').forEach(r => r.classList.remove('hidden'));
                document.querySelectorAll('#diff-result .placeholder-row').forEach(r => r.classList.add('hidden'));
            }

            let locateHash = false;
            async function diff() {
                const resultEl = document.getElementById('diff-result');
                resultEl.innerHTML = '';
                let before = document.getElementById('delivered').innerText;
                let after = document.getElementById('rendered').innerText;
                if (document.getElementById('prettier').checked) {
                    resultEl.innerHTML = 'Prettifying...';
                    await import("/assets/js/vendor/prettier-standalone-2.7.1.min.js");
                    await import("/assets/js/vendor/prettier-parser-html-2.7.1.min.js");
                    await import("/assets/js/vendor/prettier-parser-babel-2.7.1.min.js");
                    await import("/assets/js/vendor/prettier-parser-postcss-2.7.1.min.js");
                    const opts = {
                        parser: "html",
                        plugins: prettierPlugins,
                    };
                    try {
                        before = prettier.format(before, opts);
                    } catch (e) {
                        const escapedMessage = e.message
                            .replaceAll('&', '&amp;')
                            .replaceAll('<', '&lt;')
                            .replaceAll('>', '&gt;')
                            .replaceAll('"', '&quot;')
                            .replaceAll("'", '&#039;');
                        resultEl.innerHTML = `
                            <p class="error">The prettifier returned an error while parsing the delivered HTML</p>
                            <p>${e.name}</p>
                            <pre>${escapedMessage}</pre>`;
                        return;
                    }
                    after = prettier.format(after, opts);
                }

                resultEl.innerHTML = 'Diffing...';

                diffWorker.postMessage({
                    before,
                    after,
                });
                diffWorker.onmessage = (msg) => {
                    const diff = msg.data;
                    const table = document.createElement('table');
                    let addedLineCount = 0;
                    let removedLineCount = 0;
                    let totalLineCount = 0;
                    let pretty_href = document.getElementById('prettier').checked ? '_pretty' : '';
                    const showLines = [];
                    for (let i = 0; i < diff.length; i++) {
                        diff[i].value.trimEnd().split('\n').forEach(_ => {
                            totalLineCount++;
                            if (diff[i].removed) {
                                showLines.push(totalLineCount - 1, totalLineCount - 2, totalLineCount - 3);
                            }
                            if (diff[i].added) {
                                showLines.push(totalLineCount + 1, totalLineCount + 2, totalLineCount + 3);
                            }
                        });
                    }
                    totalLineCount = 0;
                    let hiddenPlaceholderShown = false;
                    for (let i = 0; i < diff.length; i++) {
                        diff[i].value.trimEnd().split('\n').forEach(value => {
                            totalLineCount++;
                            let row = document.createElement('tr');
                            let td, node;
                            if (diff[i].removed) {
                                hiddenPlaceholderShown = false;
                                removedLineCount++;
                                td = document.createElement('td');
                                td.innerHTML = `<a class="del" name="removed_${removedLineCount}${pretty_href}" href="#removed_${removedLineCount}${pretty_href}">${removedLineCount}</a>`;
                                row.appendChild(td);
                                td = document.createElement('td');
                                td.appendChild(document.createTextNode(''));
                                row.appendChild(td);
                                node = document.createElement('del');
                                node.appendChild(document.createTextNode(value));
                            } else if (diff[i].added) {
                                hiddenPlaceholderShown = false;
                                addedLineCount++;
                                td = document.createElement('td');
                                td.appendChild(document.createTextNode(''));
                                row.appendChild(td);
                                td = document.createElement('td');
                                td.innerHTML = `<a class="ins" name="added_${addedLineCount}${pretty_href}" href="#added_${addedLineCount}${pretty_href}">${addedLineCount}</a>`;
                                row.appendChild(td);
                                node = document.createElement('ins');
                                node.appendChild(document.createTextNode(value));
                            } else {
                                addedLineCount++;
                                removedLineCount++;
                                td = document.createElement('td');
                                td.innerHTML = `<a name="removed_${removedLineCount}${pretty_href}" href="#removed_${removedLineCount}${pretty_href}">${removedLineCount}</a>`;
                                row.appendChild(td);
                                td = document.createElement('td');
                                td.innerHTML = `<a name="added_${addedLineCount}${pretty_href}" href="#added_${addedLineCount}${pretty_href}">${addedLineCount}</a>`;
                                row.appendChild(td);
                                node = document.createTextNode(value);
                                if (!showLines.includes(totalLineCount)) {
                                    row.setAttribute('class', 'hidden');
                                    if (!hiddenPlaceholderShown) {
                                        hiddenPlaceholderShown = true;
                                        const placeholderRow = document.createElement('tr');
                                        placeholderRow.setAttribute('class', 'placeholder-row');
                                        const placeholderCell = document.createElement('td');
                                        placeholderCell.colSpan = 3;
                                        const button = document.createElement('button');
                                        button.innerHTML = 'Hidden lines containing no differences. (click to expand)';
                                        button.onclick = showAll;
                                        placeholderCell.appendChild(button);
                                        placeholderRow.appendChild(placeholderCell);
                                        table.appendChild(placeholderRow);
                                    }
                                }
                            }
                            td = document.createElement('td');
                            td.setAttribute('class', 'left');
                            let pre = document.createElement('pre');
                            pre.appendChild(node);
                            td.appendChild(pre);
                            row.appendChild(td);
                            table.appendChild(row);
                        });
                    }
                    resultEl.innerHTML = '';
                    resultEl.appendChild(table);
                    if (locateHash) {
                        location = location.hash;
                        locateHash = false;
                    }
                };

            }

            document.getElementById('prettier').addEventListener('change', diff);
            if (location.hash.endsWith('_pretty')) {
                document.getElementById('prettier').click();
                locateHash = true;
            } else {
                diff();
            }
        </script>
        @endif

    </div>
</div>

@endsection