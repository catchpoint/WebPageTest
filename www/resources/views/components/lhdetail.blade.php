@if ($item->type === "node")
    <td>
        <b class="lh-selector">
            {{ $item->selector }}
        </b>
        {!! nl2br(e($item->explanation)) !!}
    </td>
@elseif (is_numeric($item))
    <td class="numeric">
        {{ round($item) }}
    </td>
@elseif ($item->type === "source-location")
    <td>
        <ul>
            <li>URL: {{ $item->url }}</li>
            <li>Line: {{ $item->line }}</li>
            <li>Column: {{ $item->column }}</li>
        </ul>
    </td>
@elseif ($item->type === "link")
    <td>
        @if ($item->url)
            <a href="{{ $item->url }}">{{ $item->text }}</a>
        @else
            {{ $item->text }}
        @endif
    </td>
@elseif ($item->type === "code")
    <td>
        {{ $item->value }}
    </td>
@else
    <td>
        {{ $item }}
    </td>
@endif