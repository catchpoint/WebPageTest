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

@if ($audit->details->type === "table" || $audit->details->type === "opportunity")
<?php
$thesekeys = array();
?>
<div class="scrollableTable">
<table class="lh-details">
    <thead><tr>
        @foreach ($audit->details->headings as $heading)
        <?php $hedText = isset($heading->text) ? $heading->text : $heading->label; ?>
        @if ($hedText)
        <?php array_push($thesekeys, $heading->key); ?>
        <th class="{{ $heading->key }}">{{ $hedText }} </th>
        @endif
        @endforeach
    </tr></thead>
    <tbody>
        @foreach ($audit->details->items as $item)
        <tr>
        @foreach ($thesekeys as $key)
            <td>{{ $item->$key }}</td>
        @endforeach
        </tr>
        @endforeach
    </tbody>
</table>
</div>
@endif
