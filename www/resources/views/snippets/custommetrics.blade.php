<details class="details_custommetrics">
    <summary>Custom Metrics Data</summary>
    <dl class="glossary">
        @foreach ($data['custom'] as $metric)
            @if (array_key_exists($metric, $data))
            <dt>{{ $metric }}</dt>
            <dd class="scrollableLine">
                @if (!is_string($data[$metric]) && !is_numeric($data[$metric]))
                    {{ json_encode($data[$metric]) }}
                @else
                    {{ $data[$metric] }}
                @endif
            </dd>
            @endif
        @endforeach
    </dl>
</details>