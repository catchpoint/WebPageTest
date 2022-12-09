<li class="experiments_details lh_audit-{{ $audit->scoreDisplayMode }} lh_audit-{{ $audit->scoreDescription }}">
    <details @if ($audit->scoreDescription === "fail" || $audit->scoreDescription === "average") open @endif>
        <summary>{!! md($audit->title) !!}</summary>
        <div class="experiments_details_body">
            <div class="experiments_details_desc">
                <p>{!! md($audit->description) !!}</p>
                @include('partials.details')
            </div>
    </details>
</li>