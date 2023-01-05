@extends('default')

@section('style')
<style>
#result ul {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    gap: 1px;
    margin: 3em 0 2em -1em;
    padding: 0;
    overflow: hidden;
}
#result li {
    font-size: 1.3em;
    font-weight: 700;
    margin: 0;
    padding: 1em;
    color: #2a3c64;
    outline: 1px solid #eee;
    background:#fff;
}
#result li img {
    display: inline-block;
    margin-right: .2em;
    width: auto;
    height: 1.3em;
    max-width: none;
    background: #fff;
    border: 1px solid #2a3c643d;
    padding: .3em;
    border-radius: .3em;
    vertical-align: middle;
}
#result li > * {
    font-size: .7em;
    font-weight: 500;
}
#result dt {
    float: left;
    clear: left;
    font-weight: 700;
    margin-right: .5em;
}
#result dd {
    display: block;
    padding-bottom: .5em;
    margin: 0;
    color: #333;
}
</style>
@endsection

@section('content')
<div class="results_main_contain">
    <div class="results_main">
        <div class="results_and_command">
            <div class="results_header">
                <h2>
                    @if ($count > 1)
                        {{ $count }}
                    @endif
                    Detected Technologies
                </h2>
                <p>Data about the technologies used on the page, as detected by <a href="https://www.wappalyzer.com/">Wappalyzer</a>.</p>
            </div>
        </div>
        @if ($error_message)
            <div id="result" class="results_body error-banner">
                <div>{{ $error_message }}</div>
            </div>
        @else
        <div id="result" class="results_body @if ($error_message) error-banner @endif">
            <ul>
            @foreach ($detected as $name => $tech)
            <li>
                @if ($tech['icon'])
                    <img
                        onerror="this.style.display = 'none'; this.onerror = null"
                        src="/assets/images/wappalyzer-icons/{{$tech['icon']}}"
                    >
                @endif
                {{ $name }}
                <dl>
                    @if ($tech['description'])
                        <dt>Description</dt>
                        <dd>{{ $tech['description'] }}</dd>
                    @endif
                    @if ($tech['version'])
                        <dt>Version</dt>
                        <dd>{{ $tech['version'] }}</dd>
                    @endif
                    <dt>Category</dt>
                    <dd>{{ $tech['categories'][0]['name'] }}</dd>
                    <dt>Detection confidence</dt>
                    <dd>{{ $tech['confidence'] }}</dd>
                    <dt>Website</dt>
                    <dd><a href="{{ $tech['website']}}">{{ $tech['website'] }}</a></dd>

                </dl>
            </li>
            @endforeach
            </ul>
        </div>
        @endif

    </div>
</div>

@endsection