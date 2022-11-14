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
#delivered, #rendered {
    display: none;
}
#diff-result {
    white-space: pre-wrap;
    font-family: Consolas, Monaco, Andale Mono, Ubuntu Mono, monospace;
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
                <pre id="diff-result"></pre>
            </div>
            <pre id="delivered">{{$delivered_html}}</pre>
            <pre id="rendered">{{$rendered_html}}</pre>
        </div>
        <script src="/assets/js/vendor/diff-5.1.0.min.js"></script>
        <script type="module">
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
                const fragment = document.createDocumentFragment();
                for (let i = 0; i < diff.length; i++) {

                    if (diff[i].added && diff[i + 1] && diff[i + 1].removed) {
                        let swap = diff[i];
                        diff[i] = diff[i + 1];
                        diff[i + 1] = swap;
                    }

                    let node;
                    if (diff[i].removed) {
                        node = document.createElement('del');
                        node.appendChild(document.createTextNode(diff[i].value));
                    } else if (diff[i].added) {
                        node = document.createElement('ins');
                        node.appendChild(document.createTextNode(diff[i].value));
                    } else {
                        node = document.createTextNode(diff[i].value);
                    }
                    fragment.appendChild(node);
                }
                document.getElementById('diff-result').innerHTML = '';
                document.getElementById('diff-result').appendChild(fragment);
            }
            diff();
            document.getElementById('prettier').addEventListener('change', diff);
        </script>
        @endif

    </div>
</div>

@endsection