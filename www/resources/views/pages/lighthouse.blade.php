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

function gradeScoreCSSClass($score)
{
    if ($score < 0.9) {
        return "ok";
    } else if ($score < 0.5) {
        return "poor";
    }
    return "good";
}
?>

@section('content')
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
                    WebPageTest offers Lighthouse test runs alongside its suite of tools.
                    Lighthouse is an open-source, automated tool for improving the quality of web pages.
                    You can run it against any web page, public or requiring authentication.
                    It has audits for performance, accessibility, progressive web apps, SEO and more.
                </p>
                @if ($screenshot)
                    <img src="{{ $screenshot }}">
                @endif
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
        </div>
        <div id="result" class="experiments_grades results_body">
            <div id="average">
                <div class='experiments_grades results_body'>
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
                            @if (count($audits[$category->title]['diagnostics']))
                            <h4>Diagnostics ({{ count($audits[$category->title]['diagnostics']) }})</h4>
                            <ol>
                                @foreach ($audits[$category->title]['diagnostics'] as $audit)
                                <li class="experiments_details-bad lh_audit_mode-{{ $audit->scoreDisplayMode }}">
                                    <details open>
                                        <summary>{!! md($audit->title) !!}</summary>
                                        <div class="experiments_details_body">
                                            <div class="experiments_details_desc">
                                                <p>{!! md($audit->description) !!}</p>
                                            </div>
                                    </details>
                                </li>
                                @endforeach
                            </ol>
                            @endif

                            @if (count($audits[$category->title]['passed']))
                            <h4>Passed Audits ({{ count($audits[$category->title]['passed']) }})</h4>
                            <ol>
                                @foreach ($audits[$category->title]['passed'] as $audit)
                                <li class="experiments_details-good lh_audit_mode-{{ $audit->scoreDisplayMode }}">
                                    <details>
                                        <summary>{!! md($audit->title) !!}</summary>
                                        <div class="experiments_details_body">
                                            <div class="experiments_details_desc">
                                                <p>{!! md($audit->description) !!}</p>
                                            </div>
                                    </details>
                                </li>
                                @endforeach
                            </ol>
                            @endif
                        </div>
                        @endforeach
                    </div>
                </div>
            </div>

        </div>
    </div>
</div>


@endsection