@if ($lh_only)
<a href="/?url={{ $test_url }}" class="lh_experimentlink">Experiment Available! <em>(Run a full test to view)</em></a>
@else
<a href="{{ $opps_url }}#experiment-{{$audit->relevantExperiment}}" class="lh_experimentlink">View Experiment!</a>
@endif