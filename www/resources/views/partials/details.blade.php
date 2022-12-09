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
