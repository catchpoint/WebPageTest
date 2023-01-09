@if ($audit->details->type === "criticalrequestchain")
<ol class="lh-chain">
    @each('partials.lighthouse.requestchain', $audit->details->chains, 'chain')
</ol>
@endif
@if (count($audit->details->headings) && ($audit->details->type === "table" || $audit->details->type === "opportunity") )
<?php
$itemkeys = [];
$subkeys = [];
?>
<div class="scrollableTable">
    <table class="lh-details">
        <thead>
            <tr>
                @foreach ($audit->details->headings as $heading)
                    <?php
                    $itemkeys[] = $heading->key;
                    $subkeys[]  = $heading->subItemsHeading->key;
                    ?>
                    <th class="{{ $heading->key }}">
                        {{ $heading->text ?? $heading->label }}
                        @if ($heading->valueType && in_array($heading->valueType, ['bytes', 'timespanMs']))
                            ({{ $heading->valueType === 'timespanMs' ? 'ms' : $heading->valueType}})
                        @elseif ($heading->itemType && in_array($heading->itemType, ['bytes', 'ms']))
                            ({{ $heading->itemType }})
                        @endif
                    </th>
                @endforeach
            </tr>
        </thead>
        <tbody>
            @foreach ($audit->details->items as $item)
                <tr>
                    @foreach ($itemkeys as $key)
                        <x-lhdetail :item="$item->$key" />
                    @endforeach
                </tr>
                @if ($item->subItems)

                @foreach ($item->subItems->items as $sub)
                    <tr class="lh-subitem">
                        @foreach ($subkeys as $subkey)
                            <x-lhdetail :item="$sub->$subkey" />
                        @endforeach
                    </tr>
                    @endforeach
                @endif

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