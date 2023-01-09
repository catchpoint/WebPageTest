<li data-audit-id="{{ $audit->id }}" class="experiments_details lh_audit-{{ $audit->scoreDisplayMode }} lh_audit-{{ $audit->scoreDescription }}">
    <details>
        <summary>
            <div class="summary_text">
                <div>
                    {!! md($audit->title) !!}
                    @if($audit->relevantExperiment)
                        @include('partials.lighthouse.auditExperiment')
                    @endif
                </div>
                @if ($audit->displayValue)
                    @if (isset($audit->details->overallSavingsMs) && $audit->details->overallSavingsMs > 0)
                    <p>Estimated savings {{ round($audit->details->overallSavingsMs / 1000, 2) }} s</p>
                    @else
                    {!! md($audit->displayValue) !!}
                    @endif
                @endif
            </div>
        </summary>
        <div class="experiments_details_body">
            <div class="experiments_details_desc">
                @if ($audit->id === 'use-landmarks')
                <p>{!! e(substr($audit->description, 0, strpos($audit->description, '['))) !!}</p>
                @else
                <p>{!! md($audit->description) !!}</p>
                @endif

                @if ($audit->details)
                @include('partials.lighthouse.details')
                @endif
            </div>
    </details>
</li>