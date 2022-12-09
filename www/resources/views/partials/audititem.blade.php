<li class="experiments_details lh_audit-{{ $audit->scoreDisplayMode }} lh_audit-{{ $audit->scoreDescription }}">
    <details>
        <summary>{!! md($audit->title) !!}</summary>
        <div class="experiments_details_body">
            <div class="experiments_details_desc">
                <p>{!! md($audit->description) !!}</p>
            </div>
    </details>
</li>