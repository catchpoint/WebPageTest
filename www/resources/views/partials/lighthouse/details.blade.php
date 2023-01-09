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
                    $headingText = $heading->text ?? $heading->label;
                    if ($headingText) {
                        $itemkeys[] = $heading->key;
                    }
                    if ($heading->subItemsHeading) {
                        $subkeys[]  = $heading->subItemsHeading->key;
                    }
                    ?>
                    @if ($headingText)
                    <th class="{{ $heading->key }}">
                        {{ $headingText }}
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
                    @foreach ($itemkeys as $key)
                        <x-lhdetail :item="$item->$key" />
                    @endforeach
                </tr>
                @if ($item->subItems && count($item->subItems->items))
                    <tr>
                        <td colspan="{{ count($itemkeys) }}">
                            <table width="100%">
                                <thead>
                                    <tr>
                                        @foreach ($subkeys as $subkey)
                                        <th>{{ prettyKey($subkey) }}</th>
                                        @endforeach
                                    </tr>
                                </thead>
                                <tbody>
                                    @foreach ($item->subItems->items as $sub)
                                        <tr>
                                            @foreach ($subkeys as $subkey)
                                                <x-lhdetail :item="$sub->$subkey" />
                                            @endforeach
                                        </tr>
                                    @endforeach
                                </tbody>
                            </table>
                        </td>
                    </tr>
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