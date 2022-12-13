<li data-audit-id="{{ $audit->id }}" class="experiments_details lh_audit-{{ $audit->scoreDisplayMode }} lh_audit-{{ $audit->scoreDescription }}">
    <details @if (!$detailsclosed) open @endif>
        <summary>
            <div class="summary_text"><div>{!! md($audit->title) !!}@if($audit->relevantExperiment) @include('partials.auditExperiment') @endif</div> @if($audit->displayValue){!! md($audit->displayValue) !!}@endif</div>
        </summary>
        <div class="experiments_details_body">
            <div class="experiments_details_desc">
                <p>{!! md($audit->description) !!}</p>
                @if ($audit->details)
                @include('partials.details')
                @endif
            </div>
    </details>
</li>