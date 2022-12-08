@if ($audit->details->type === "criticalrequestchain")
<ol class="lh-chain">
    @foreach ($audit->details->chains as $chain)
    <li>
        <span>
            <span>{{ $chain->request->url }}</span>
            <span>{{ round($chain->request->transferSize / 1024) }}kb</span>
        </span>
        @if ($chain->children)
            <ol>
            @foreach ($chain->children as $child)
            <li>
                <span>
                    <span>{{ $child->request->url }}</span>
                    <span>{{ round($child->request->transferSize / 1024) }}kb</span>
                </span>
            </li>
            @endforeach
            </ol>
        @endif
    </li>
    @endforeach
</ol>
@endif
