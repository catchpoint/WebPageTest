@extends('default')

@section('content')

<div class="history_hed">
    <h1>Test History{{$all}}</h1>
    <div class="box">
        <form name="filterLog" method="get" action="/testlog.php" style="margin: 1.3em 0">
            View <select name="days" size="1" style="display: inline">
                <option value="1" @if ($days===1) selected @endif>1 Day</option>
                <option value="7" @if ($days===7) selected @endif>7 Days</option>
                <option value="30" @if ($days===30) selected @endif>30 Days</option>
                <option value="128" @if ($days===128) selected @endif>128 Days</option>
                <option value="365" @if ($days===365) selected @endif>1 Year</option>

            </select> test log for URLs containing
            <input id="filter" name="filter" type="text" style="width:30em" value="{{ $filter }}">
            <input id="SubmitBtn" type="submit" value="Update List">
            <br><br>
            @if ($adminish)
                <label><input id="all" type="checkbox" name="all" @if ($all) checked @endif onclick="this.form.submit();"> Show tests from all users</label> &nbsp;&nbsp;
            @endif
            @if ($requestIP)
                <input type="hidden" name="ip" value="1">
            @endif
            @if ($local)
                <input type="hidden" name="local" value="1">
            @endif
            <label><input id="video" type="checkbox" name="video" @if ($onlyVideo) checked @endif onclick="this.form.submit();"> Only list tests which include video</label> &nbsp;&nbsp;
            <label><input id="repeat" type="checkbox" name="repeat" @if ($repeat) checked @endif onclick="this.form.submit();"> Show repeat view</label>
            <label><input id="nolimit" type="checkbox" name="nolimit" @if ($nolimit) checked @endif onclick="this.form.submit();"> Do not limit the number of results (warning: WILL be slow)</label>
        </form>
    </div>
    <div class="box">
        <form name="compare" method="get" action="/video/compare.php">
            <input id="CompareBtn" type="submit" value="Compare">
            <table class="history pretty">
                <thead>
                    <tr>
                        <th>Select to Compare</th>
                        <th>Date/Time</th>
                        <th>From</th>
                        @if ($includeip)
                            <th>Requested By</th>
                        @endif
                        @if ($admin)
                            <th>User</th>
                            <th>Page Loads</th>
                        @endif
                        <th>Label</th>
                        <th>URL</th>
                    </tr>
                </thead>
                @foreach ($history as
                    [
                        'guid' => $guid,
                        'url' => $url,
                        'video' => $video,
                        'repeat' => $repeat,
                        'private' => $private,
                        'newDate' => $newDate,
                        'location' => $location,
                        'ip' => $ip,
                        'testUID' => $testUID,
                        'testUser' => $testUser,
                        'email' => $email,
                        'key' => $key,
                        'count' => $count,
                        'label' => $label,
                        'shortURL' => $shortURL,
                        'link' => $link,
                        'labelTxt' => $labelTxt,
                    ])
                <tr>
                    <th class="history_checkbox">
                        @if (isset($guid) && $video && !($url == "Bulk Test" || $url == "Multiple Locations test"))
                            <input type="checkbox" name="t[]" value="{{ $guid }}" title="First View">
                            @if ($repeat)
                                <input type="checkbox" name="t[]" value="{{ $guid }}-c:1" title="Repeat View">
                            @endif
                        @endif
                    </th>
                    <td class="date">
                        @if ($private)
                            <b>
                        @endif
                        {{ $newDate }}
                        @if ($private)
                            </b>
                        @endif
                    </td>
                    <td class="location scrollable-td"><div class="scrollable-td-content">{!! $location !!}</div>
                        @if ($video)
                            <span>(video)</span>
                        @endif
                    </td>
                    @if ($includeip)
                        <td class="ip">{{ $ip }}</td>
                    @endif

                    @if ($admin)
                        @if (isset($testUID))
                            <td class="uid">{{ $testUser }} ({{ $testUID }})</td>
                        @elseif (isset($email))
                            <td class="uid">{{ $email }}</td>
                        @elseif (isset($key))
                            <td class="uid">{{ $key }}</td>
                        @else
                            <td class="uid"></td>
                        @endif
                        <td class="count">{{ $count }}</td>
                    @endif
                    <td title="{{ $label }}" class="label">
                        <a href="{{ $link }}" id="label_{{ $guid }}">{{ $labelTxt }}</a>
                    </td>
                    <td class="url scrollable-td"><div class="scrollable-td-content"><a title="{{ $url }}" href="{{ $link }}">{{ $shortURL }}</a></div></td>
                </tr>
                @endforeach
            </table>
        </form>
    </div>
</div>
@endsection