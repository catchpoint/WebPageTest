@extends('default')

@section('content')

<div class="translucent">
    <h1>Oops...</h1>
    <p>Your test request was intercepted by our abuse filters
        (or because we need to talk to you about how you are submitting tests or the volume of tests you are submitting).</p>
    <p>Most free web hosts have been blocked from testing because of excessive link spam.</p>
    <p>If you are trying to test with an URL-shortener (t.co, goo.gl, bit.ly, etc) then those are also blocked, please test the URL directly.</p>
    @if ($contact)
        <p>If there is a site you want tested that was blocked, please <a href="mailto:{{ $contact }}">contact us</a>
           and send us your IP address (below) and URL that you are trying to test</p>
    @endif

    <p>
        Your IP address: <b>{{ $ip }}</b><br>
    </p>
</div>

@endsection