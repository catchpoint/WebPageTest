@extends('default')

@section('style')
<style>
    del {
        text-decoration: none;
        color: #b30000;
        background: #fadad7;
    }

    ins {
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

</style>
@endsection

@section('content')
<div class="results_main_contain">
    <div class="results_main">
        <div class="results_and_command">
            <div class="results_header">
                <h2>HTML Diff</h2>
                <p>A diff between the HTML delivered over the network and the generated HTML</p>
            </div>
        </div>
        @if ($error_message)
        <div id="result" class="results_body error-banner">
            <div>{{ $error_message }}</div>
        </div>
        @else
        <label>
            <input type="checkbox" id="prettier">
            Run Prettier before the diff
        </label>
        <div id="result" class="results_body @if ($error_message) error-banner @endif">
            <div class="overflow-container">
                <div id="diff-result"></div>
            </div>
            <pre id="delivered">{{$delivered_html}}</pre>
            <pre id="rendered">{{$rendered_html}}</pre>
        </div>
        <script src="/assets/js/vendor/diff-5.1.0.min.js"></script>
        <script type="module">
            let locateHash = false;
            async function diff() {
                let before = document.getElementById('delivered').innerText;
                let after = document.getElementById('rendered').innerText;
                if (document.getElementById('prettier').checked) {
                    await import("/assets/js/vendor/prettier-standalone-2.7.1.min.js");
                    await import("/assets/js/vendor/prettier-parser-html-2.7.1.min.js");
                    await import("/assets/js/vendor/prettier-parser-babel-2.7.1.min.js");
                    await import("/assets/js/vendor/prettier-parser-postcss-2.7.1.min.js");
                    const opts = {
                        parser: "html",
                        plugins: prettierPlugins,
                    };
                    before = prettier.format(before, opts);
                    after = prettier.format(after, opts);
                }

                const diff = Diff.diffLines(before, after);
                const table = document.createElement('table');
                let addedLineCount = 0;
                let removedLineCount = 0;
                let pretty_href = document.getElementById('prettier').checked ? '_pretty' : '';
                for (let i = 0; i < diff.length; i++) {
                    diff[i].value.split('\n').forEach(value => {
                        let row = document.createElement('tr');
                        let td, node;
                        if (diff[i].removed) {
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
                document.getElementById('diff-result').innerHTML = '';
                document.getElementById('diff-result').appendChild(table);
                if (locateHash) {
                    location = location.hash;
                    locateHash = false;
                }
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