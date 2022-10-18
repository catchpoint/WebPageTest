<table class="checklist">
    <thead>
        <tr>
            <th>Request</th>
            @foreach ($headers as $key => $text)
            <th>
                {{ $text }}
                <br />
                @if (isset($pageData[$key]) && $pageData[$key] >= 0 && $pageData[$key] <= 100)
                    {{ $pageData[$key] }}%
                @else
                    N/A
                @endif
            </th>
            @endforeach
        </tr>
    </thead>
    <tbody>
        @foreach ($rows as $row)
        <tr class="table-cell-{{ $row['color'] ?? ($loop->even ? 'even' : 'odd')}}">
            <td class="left">{{$loop->iteration}}: {{$row['label']}}</td>
            @foreach ($row['icons'] as $icon)
                <td>
                    @if ($icon)
                        <x-icon type="{{ $icon }}"/>
                    @endif
                </td>
            @endforeach
        </tr>
        @endforeach
    </tbody>
</table>