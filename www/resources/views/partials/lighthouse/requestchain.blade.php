<li>
    <span>
        <span>
            @if (str_starts_with($chain->request->url, 'data:'))
            {{ substr($chain->request->url, 0, 300) }} ...
            @else
            {{ $chain->request->url }}
            @endif
        </span>
        <span>{{ round($chain->request->transferSize / 1024) }}kb</span>
    </span>
    @if ($chain->children)
    <ol>
        @each('partials.lighthouse.requestchain', $chain->children, 'chain')
    </ol>
    @endif
</li>