@extends('default')

<?php
// lh-specific helper functions
function gradeFromScore($score)
{
    $grade = "a";
    if ($score < 0.9) {
        $grade = "c";
    }
    if ($score < 0.5) {
        $grade = "f";
    }
    return $grade;
}
?>

@section('content')
<script>
if (navigator.clipboard) {
    function copySelector(selector) {
        navigator.clipboard.writeText(`document.querySelectorAll('${selector}')`);
    }
    window.addEventListener('load', () => {
        document.querySelectorAll('.lh-selector').forEach(el => {
            el.title = "Click to copy a querySelectorAll() snippet";
            el.addEventListener('click', () => copySelector(el.innerText));
        });
    });
}
</script>
<div class="results_main_contain">
    <div class="results_main results_main-lh">
        <div class="results_and_command">
            <div class="results_header">
                <h2 class="lh-logo">
                    <svg class="lh-topbar__logo" viewBox="0 0 24 24">
                        <defs>
                            <linearGradient x1="57.456%" y1="13.086%" x2="18.259%" y2="72.322%" id="lh-topbar__logo--a">
                                <stop stop-color="#262626" stop-opacity=".1" offset="0%"></stop>
                                <stop stop-color="#262626" stop-opacity="0" offset="100%"></stop>
                            </linearGradient>
                            <linearGradient x1="100%" y1="50%" x2="0%" y2="50%" id="lh-topbar__logo--b">
                                <stop stop-color="#262626" stop-opacity=".1" offset="0%"></stop>
                                <stop stop-color="#262626" stop-opacity="0" offset="100%"></stop>
                            </linearGradient>
                            <linearGradient x1="58.764%" y1="65.756%" x2="36.939%" y2="50.14%" id="lh-topbar__logo--c">
                                <stop stop-color="#262626" stop-opacity=".1" offset="0%"></stop>
                                <stop stop-color="#262626" stop-opacity="0" offset="100%"></stop>
                            </linearGradient>
                            <linearGradient x1="41.635%" y1="20.358%" x2="72.863%" y2="85.424%" id="lh-topbar__logo--d">
                                <stop stop-color="#FFF" stop-opacity=".1" offset="0%"></stop>
                                <stop stop-color="#FFF" stop-opacity="0" offset="100%"></stop>
                            </linearGradient>
                        </defs>
                        <g fill="none" fill-rule="evenodd">
                            <path d="M12 3l4.125 2.625v3.75H18v2.25h-1.688l1.5 9.375H6.188l1.5-9.375H6v-2.25h1.875V5.648L12 3zm2.201 9.938L9.54 14.633 9 18.028l5.625-2.062-.424-3.028zM12.005 5.67l-1.88 1.207v2.498h3.75V6.86l-1.87-1.19z" fill="#F44B21"></path>
                            <path fill="#FFF" d="M14.201 12.938L9.54 14.633 9 18.028l5.625-2.062z"></path>
                            <path d="M6 18c-2.042 0-3.95-.01-5.813 0l1.5-9.375h4.326L6 18z" fill="url(#lh-topbar__logo--a)" fill-rule="nonzero" transform="translate(6 3)"></path>
                            <path fill="#FFF176" fill-rule="nonzero" d="M13.875 9.375v-2.56l-1.87-1.19-1.88 1.207v2.543z"></path>
                            <path fill="url(#lh-topbar__logo--b)" fill-rule="nonzero" d="M0 6.375h6v2.25H0z" transform="translate(6 3)"></path>
                            <path fill="url(#lh-topbar__logo--c)" fill-rule="nonzero" d="M6 6.375H1.875v-3.75L6 0z" transform="translate(6 3)"></path>
                            <path fill="url(#lh-topbar__logo--d)" fill-rule="nonzero" d="M6 0l4.125 2.625v3.75H12v2.25h-1.688l1.5 9.375H.188l1.5-9.375H0v-2.25h1.875V2.648z" transform="translate(6 3)"></path>
                        </g>
                    </svg>
                    Lighthouse Report
                </h2>
                <p>

                    Lighthouse is an open-source, automated tool for improving the quality of web pages.
                    You can run it against any web page, public or requiring authentication. Overall scoring color key:
                    (<span class="lh_score_grade-fail">0-49</span>
                    <span class="lh_score_grade-average">50-89</span>
                    <span class="lh_score_grade-pass">90-100</span>).
                </p>
            </div>
            <div class="opps_note">
                <p><strong>Did you know?</strong> Lighthouse runs in Chrome and provides a great complementary analysis alongside the many browsers, devices, and locations WebPageTest offers. To see how this site performs in more environments: <a href="/?url={{ $test_url }}">Start a new test</a></p>

            </div>
        </div>
        <div class="opportunities_summary">
            <nav class="results_lh_nav">
                @foreach ($results->categories as $category)
                <a href="#{{ $category->title}}" class="lh_score lh_score_grade-{{ gradeFromScore($category->score) }}">
                    <span class="lh_score_cat">{{ $category->title }}</span>
                    <span class="lh_score_number">
                        <svg class="lh-gauge" viewBox="0 0 120 120">
                            <circle class="lh-gauge-base" r="56" cx="60" cy="60" stroke-width="8"></circle>
                            <circle class="lh-gauge-arc" r="56" cx="60" cy="60" stroke-width="8" style="transform: rotate(-87.9537deg); stroke-dasharray: {{ $category->score * 360 }}, 351.858;"></circle>
                        </svg>
                        {{ round(100 * $category->score) }}
                    </span>
                </a>
                @endforeach
            </nav>
        </div>
        <div id="result" class="experiments_grades results_body">
            <div id="average">
                <div class='experiments_grades'>
                    <div class="form_clip">
                        @foreach ($results->categories as $category)
                        <div class="grade_header grade_header-lighthouse" id="{{ $category->title }}">
                            <h3 class=" grade_heading lh_score lh_score_grade-{{ gradeFromScore($category->score) }}">
                                <span class="lh_score_cat">{{ $category->title }}</span>
                                <span class="lh_score_number">
                                    <svg class="lh-gauge" viewBox="0 0 120 120">
                                        <circle class="lh-gauge-base" r="56" cx="60" cy="60" stroke-width="8"></circle>
                                        <circle class="lh-gauge-arc" r="56" cx="60" cy="60" stroke-width="8" style="transform: rotate(-87.9537deg); stroke-dasharray: {{ $category->score * 360 }}, 351.858;"></circle>
                                    </svg>
                                    {{ round(100 * $category->score) }}
                                </span>
                            </h3>
                        </div>
                        <div class="experiments_bottlenecks">
                            @if ($category->title === 'Performance')
                            <h4 class="hed_sub hed_sub-lighthouse">Lighthouse Metrics</h4>
                            <details class="metrics_shown">
                                <summary>Values are estimated and may vary.</summary>
                                <p><span>The <a rel="noopener" target="_blank" href="https://web.dev/performance-scoring/?utm_source=lighthouse&amp;utm_medium=wpt">performance score is calculated</a> directly from these metrics.</span>
                                    <a class="lh-calclink" target="_blank" href="https://googlechrome.github.io/lighthouse/scorecalc/">See calculator.</a>
                                </p>
                            </details>

                            <div class="scrollableTable">
                                <table id="tableResults" class="pretty">
                                    <tbody>
                                        <tr class="metric_labels">
                                            @foreach($metrics as $metric)
                                            <th> {{ $metric->title }} </th>
                                            @endforeach
                                        </tr>
                                        <tr>
                                            @foreach($metrics as $metric)
                                            <td class="{{ $metric->grade }}">{{ $metric->value }}<span class="units">{{ $metric->units }}</span></td>
                                            @endforeach
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            <div class="opps_note opps_note-links">
                                <p><strong>Aiming to improve?</strong>
                                    @if ($lh_only)
                                    <a href="/?url={{ $test_url }}">Run a full test</a> and then
                                    @endif
                                    check out our
                                    @if ($lh_only)
                                    <strong>Opportunities & Experiments</strong>
                                    @else
                                    <a href="{{ $opps_url }}">Opportunities & Experiments</a>
                                    @endif
                                    for suggestions and run No-Code Experiments to see how changes impact this site!
                                </p>
                            </div>

                            @if (count($thumbnails))
                            <h4>Filmstrip</h4>
                            <div class="overflow-container lh_filmstrip">
                                @foreach ($thumbnails as $thumb)
                                <div class="lh_filmstrip_item"><img src="{{ $thumb }}"></div>
                                @endforeach
                            </div>
                            @endif

                            <div class="lh-filter_map">
                                <p class="lh-filteraudits"><span>Show audits relevant to metrics:</span>
                                    @foreach($metric_filters as $filter => $active)
                                    <?php
                                    $thisurl = parse_url($_SERVER['REQUEST_URI']);
                                    parse_str($thisurl['query'], $q);
                                    $params = ['filterbymetric' => $filter];
                                    foreach ($params as $k => $v) {
                                        $q[$k] = $v;
                                    }
                                    $new_url = $thisurl['path'] . '?' . http_build_query($q);
                                    ?>
                                    <a href="{{ $new_url }}" @if ($active) aria-current="page" @endif>{{ $filter }}</a>
                                    @endforeach
                                </p>
                                <a href="https://googlechrome.github.io/lighthouse/treemap/?gzip=1#{{ $treemap }}" target="_blank" class="lh-maplink">View Tree Map</a>
                            </div>
                            @endif

                            @foreach ($audits[$category->id] as $cat_id => $cat_audits)
                            @if (count($cat_audits))
                            <h4>{{ $groupTitles[$cat_id] }} ({{ count($cat_audits) }})</h4>
                            <ol>
                                @foreach ($cat_audits as $audit)
                                @include('partials.lighthouse.audititem')
                                @endforeach
                            </ol>
                            @endif
                            @endforeach

                        </div>
                        @endforeach
                    </div>
                </div>

            </div>
        </div>
    </div>

</div>
@endsection
