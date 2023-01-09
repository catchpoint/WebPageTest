@if ($audit->details->type === "criticalrequestchain")
<ol class="lh-chain">
    @each('partials.lighthouse.requestchain', $audit->details->chains, 'chain')
</ol>
@endif
@if (count($audit->details->headings) && ($audit->details->type === "table" || $audit->details->type === "opportunity") )
<?php
$thesekeys = array();
?>
<div class="scrollableTable">
    <table class="lh-details">
        <thead>
            <tr>
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
            </tr>
        </thead>
        <tbody>
            @foreach ($audit->details->items as $item)
            <tr>
                @foreach ($thesekeys as $key)
                @if ($item->$key->type === "node")
                <td><b class="lh-selector">
                    {{ $item->$key->selector }}
                </b>
                    {!! nl2br(e($item->$key->explanation)) !!}
                </td>
                @elseif (is_numeric($item->$key))
                <td class="numeric">
                    {{ round($item->$key) }}
                </td>
                @elseif ($item->$key->type === "source-location")
                <td>
                    <ul>
                        <li>URL: {{ $item->$key->url }}</li>
                        <li>Line: {{ $item->$key->line }}</li>
                        <li>Column: {{ $item->$key->column }}</li>
                    </ul>
                </td>
                @elseif ($item->$key->type === "link")
                <td>
                    @if ($item->$key->url)
                    <a href="{{ $item->$key->url }}">{{ $item->$key->text }}</a>
                    @else
                    {{ $item->$key->text }}
                    @endif
                </td>
                @elseif ($item->$key->type === "code")
                <td>
                    {{ $item->$key->value }}
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


@if ($audit->details->type === "debugdata" )
@foreach ($audit->details->items as $item)
@if (count($item->failures))
<b>Failures:</b>
<ul class="lh-details-failure">
    @foreach ($item->failures as $failure)
    <li>{!! md($failure) !!}</li>
    @endforeach
</ul>
@endif
@endforeach
@endif