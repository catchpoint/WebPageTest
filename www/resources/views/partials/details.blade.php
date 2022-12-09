@if ($audit->details->type === "criticalrequestchain")
<ol class="lh-chain">
    @each('partials.requestchain', $audit->details->chains, 'chain')
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
        <th class="{{ $heading->key }}">
            {{ $hedText }}
            @if ($heading->valueType && $heading->valueType !== 'url')
            ({{ $heading->valueType === 'timespanMs' ? 'ms' : $heading->valueType}})
            @endif
        </th>
        @endif
        @endforeach
    </tr></thead>
    <tbody>
        @foreach ($audit->details->items as $item)
        <tr>
        @foreach ($thesekeys as $key)
            @if ($item->$key->type === "node")
                <td><b>{{ $item->$key->selector }}</b> {{ $item->$key->explanation }}</td>
            @else
            <td>
                {{ is_numeric($item->$key) ? round($item->$key) : $item->$key }}
            </td>
            @endif
        @endforeach
        </tr>
        @endforeach
    </tbody>
</table>
</div>
@endif
