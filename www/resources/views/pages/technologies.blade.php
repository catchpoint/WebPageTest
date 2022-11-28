@extends('default')

@section('style')
<style>
.tech-icon {
    max-width: 32px;
}
</style>
@endsection

@section('content')
<div class="results_main_contain">
    <div class="results_main">
        <div class="results_and_command">
            <div class="results_header">
                <h2>Detected technologies</h2>
                <p>Data about the technologied used on the page, as detected by <a href="https://www.wappalyzer.com/">Wappalyzer</a>.</p>
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
                        onerror="this.width = 0; this.height= 0; this.onerror = null"
                        class="tech-icon"
                        src="/assets/images/wappalyzer-icons/{{$tech['icon']}}"
                    >
                @endif
                {{ $name }}
                <dl>
                    <dt>Description</dt>
                    <dd>{{ $tech['description'] }}</dd>
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