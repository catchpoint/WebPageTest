@extends('default')

@section('style')
<style>
    .console-log {
        text-align: left;
        width: 100%;
        display: block;
        margin-left: auto;
        margin-right: auto;
    }

    .console-log th {
        padding: 0.2em 1em;
        text-align: left;
    }

    .console-log td {
        padding: 0.2em 1em;
        max-width: 100px;
    }

    .console-log .message {
        max-width: 700px;
    }

    .console-log .url {
        max-width: 300px;
    }

    div.scrollable {
        max-width: 100em;
        margin: 0;
        padding: 0;
        overflow: auto;
    }

    tr.even {
        background: whitesmoke;
    }
    .console-log-step {
        display: inline-block;
        padding: 1.5em .2em 0;
        cursor: pointer;
    }
</style>
@endsection

@section('content')
<div id="test_results-container">
    <div id="test-1" class="test_results">
        <div class="test_results-content">
            <div class="results_main_contain">
                <div class="results_main">
                    <div class="results_and_command">
                        <div class="results_header">
                            <h2>Console Log</h2>
                        </div>
                    </div>
                    <div id="result" class="results_body">
                        <div class="overflow-container">
                            @foreach ($log as $stepnum => $steplog)
                                <details open>
                                    <summary>
                                        <h4 class="console-log-step">Step_{{ $stepnum }}</h4>
                                    </summary>
                                    <table class="console-log" class="translucent">
                                        <thead>
                                        <tr>
                                            <th>Source</th>
                                            <th>Level</th>
                                            <th>Message</th>
                                            <th>URL</th>
                                            <th>Line</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        @foreach ($steplog as $log_entry)
                                        <tr @if ($loop->even) class="even" @endif>
                                            <td width="50" class="source">{{ $log_entry['source'] }} </td>
                                            <td width="50" class="level">{{ $log_entry['level'] }} </td>
                                            <td class="message">
                                                <div class="scrollable">{{ $log_entry['text'] }}</div>
                                            </td>
                                            <td class="url">
                                                <div class="scrollable"><a href={{ $log_entry['url'] }}>{{ $log_entry['url'] }}</a></div>
                                            </td>
                                            <td width="50" class="line">{{ @$log_entry['line'] }}</td>
                                        </tr>
                                        @endforeach
                                        </tbody>
                                    </table>
                                </details>
                            @endforeach
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
@endsection