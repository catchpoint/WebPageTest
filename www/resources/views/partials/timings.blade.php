<div class="scrollableTable">
    <table class="pretty scrollable" cellpadding="10" cellspacing="0" border="1">
        <thead>
            <tr>
                @foreach ($data as $category => $items)
                    @if (!empty($items))
                    <th colspan="{{ count($items) }}">
                        @switch($category)
                            @case('custom')
                                <a href="https://docs.webpagetest.org/custom-metrics/" target="_blank">Custom Metrics</a>
                                @break
                            @case('element')
                                <a href="https://developer.mozilla.org/en-US/docs/Web/API/PerformanceElementTiming" target="_blank">Element Timings</a>
                                @break
                            @case('user')
                                <a href="https://developer.mozilla.org/en-US/docs/Web/API/User_Timing_API/Using_the_User_Timing_API" target="_blank">User Timings</a>
                                @break
                            @case('navigation')
                                <a href="https://w3c.github.io/navigation-timing/#processing-model" target="_blank">Navigation Timings</a>
                                @break
                            @default
                                {{ $category }}
                        @endswitch
                    </th>
                    @endif
                @endforeach
            </tr>
            <tr>
                @foreach ($data as $category => $items)
                    @foreach ($items as $itemcategory => $_)
                    <th>
                        @if ($category === 'navigation')
                            <span title="Time it took for all event handlers to run">{{ $itemcategory }}</span>
                        @else
                            {{ $itemcategory }}
                        @endif
                    </th>
                    @endforeach
                @endforeach
            </tr>
        </thead>
        <tbody>
            <tr>
                @foreach ($data as $category => $items)
                    @foreach ($items as $item)
                    <td>
                        {{ $item }}
                    </td>
                    @endforeach
                @endforeach
            </tr>

        </tbody>
    </table>
</div>