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
            @if ($heading->valueType && in_array($heading->valueType, ['bytes', 'timespanMs']))
            ({{ $heading->valueType === 'timespanMs' ? 'ms' : $heading->valueType}})
            @elseif ($heading->itemType && in_array($heading->itemType, ['bytes', 'ms']))
            ({{ $heading->itemType }})
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
                <td><b>{{ $item->$key->selector }}</b>
                {!! nl2br(e($item->$key->explanation)) !!}
                </td>
            @elseif (is_numeric($item->$key))
            <td class="numeric">
                {{ round($item->$key) }}
            </td>
            @else
            <td>
                {{ $item->$key }}
            </td>
            @endif
        @endforeach
        </tr>
        @endforeach
    </tbody>
</table>
</div>
@endif
