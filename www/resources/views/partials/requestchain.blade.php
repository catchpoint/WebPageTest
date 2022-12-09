<li>
    <span>
        <span>{{ $chain->request->url }}</span>
        <span>{{ round($chain->request->transferSize / 1024) }}kb</span>
    </span>
    @if ($chain->children)
        <ol>
        @each('partials.requestchain', $chain->children, 'chain')
        </ol>
    @endif
</li>