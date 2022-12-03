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

@section('styles')
<style>
    /* lighthouse variations for experiments layout */
    .lh-logo {
        display: flex;
        align-items: center
    }

    .lh-logo svg {
        flex: 0 0 1.2em;
    }

    .lh_score .lh_score_number {
        font-weight: normal;
        font-family: 'Roboto Mono', 'Menlo', 'dejavu sans mono', 'Consolas', 'Lucida Console', monospace;
        width: 1.1em;
        height: 1.1em;
        line-height: 1.1em;
        display: inline-flex;
        text-align: center;
        font-size: 1em;
        border-radius: 100%;
        padding: .6em;
        align-content: center;
        justify-content: center;
        position: relative;
    }

    .lh_score_number svg {
        position: absolute;
        z-index: 0;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        transition: transform;
        transform: rotate(0deg);
    }

    .lh-gauge {
        stroke-linecap: round;
    }

    .lh-gauge-arc {
        fill: none;
        transform-origin: 50% 50%;
        animation: load-gauge 1s ease forwards;
        animation-delay: 250ms;
    }

    .lh-gauge-base {
        opacity: 0.1;
    }

    /* Gauge */
    /* Context-specific colors */
    :root {
        /* Palette using Material Design Colors
     * https://www.materialui.co/colors */
        --color-amber-50: #FFF8E1;
        --color-blue-200: #90CAF9;
        --color-blue-900: #0D47A1;
        --color-blue-A700: #2962FF;
        --color-blue-primary: #06f;
        --color-cyan-500: #00BCD4;
        --color-gray-100: #F5F5F5;
        --color-gray-300: #CFCFCF;
        --color-gray-200: #E0E0E0;
        --color-gray-400: #BDBDBD;
        --color-gray-50: #FAFAFA;
        --color-gray-500: #9E9E9E;
        --color-gray-600: #757575;
        --color-gray-700: #616161;
        --color-gray-800: #424242;
        --color-gray-900: #212121;
        --color-gray: #000000;
        --color-green-700: #080;
        --color-green: #0c6;
        --color-lime-400: #D3E156;
        --color-orange-50: #FFF3E0;
        --color-orange-700: #C33300;
        --color-orange: #fa3;
        --color-red-700: #c00;
        --color-red: #f33;
        --color-teal-600: #00897B;
        --color-white: #FFFFFF;
        --color-average-secondary: var(--color-orange-700);
        --color-average: var(--color-orange);
        --color-fail-secondary: var(--color-red-700);
        --color-fail: var(--color-red);
        --color-hover: var(--color-gray-50);
        --color-informative: var(--color-blue-900);
        --color-pass-secondary: var(--color-green-700);
        --color-pass: var(--color-green);
        --color-not-applicable: var(--color-gray-600);
    }

    .lh_score.lh_score_grade-a {
        color: var(--color-pass-secondary);
        fill: var(--color-pass);
        stroke: var(--color-pass);
    }

    .lh_score.lh_score_grade-c {
        color: var(--color-average-secondary);
        fill: var(--color-average);
        stroke: var(--color-average);
    }

    .lh_score.lh_score_grade-f {
        color: var(--color-fail-secondary);
        fill: var(--color-fail);
        stroke: var(--color-fail);
    }

    .lh-gauge__wrapper--not-applicable {
        color: var(--color-not-applicable);
        fill: var(--color-not-applicable);
        stroke: var(--color-not-applicable);
    }


    .results_main-lh .opportunities_summary {
        min-width: 100%;
        margin-bottom: 1em;
        display: block;
    }

    .results_main-lh .results_and_command {
        gap: 1em;
        width: 70%;
    }

    .results_main-lh ul.results_lh_nav {
        display: flex;
        flex: 1 0 100%;
        gap: 1em;
        flex-flow: row wrap;
    }

    .results_lh_nav a {
        flex: 1 1 auto;
        justify-content: center;
        align-items: center;
        font-weight: 700;
        gap: 0.5em;
        font-size: 1.1em;
        flex-flow: row;
        padding-right: 2em;
    }

    .results_lh_nav a:hover .lh_score_cat,
    .results_lh_nav a:focus .lh_score_cat {
        text-decoration: underline
    }

    .results_lh_nav a:hover .lh_score_number,
    .results_lh_nav a:focus .lh_score_number {
        text-decoration: none;
        box-shadow: 0 0 3px #aaa;
    }

    .results_lh_nav span.lh_score_cat {
        color: #2a3b64;
    }


    .results_main-lh .experiments_bottlenecks {
        position: relative;
    }

    .results_main-lh details.metrics_shown {
        top: 1em;
        right: 0;
    }

    .grade_heading.lh_score {
        display: flex;
        justify-content: space-between;
        width: 100%;
        flex: 1 1 auto;
    }

    .grade_heading.lh_score .lh_score_number {
        font-size: .7em;
    }

    .grade_heading.lh_score .lh_score_cat {
        flex: 1 1 calc(100% - 5rem);
        font-weight: 900;
        color: #2a3b64;
    }

    .results_main-lh span.units {
        text-transform: uppercase;
    }

    .results_main-lh h4 {
        margin: 1em 0 0;
        border-bottom: 1px solid #eee;
    }

    .results_main-lh summary p {
        display: inline;
    }

    .results_main-lh summary em p {
        font-weight: normal;
    }

    .results_main-lh p:empty {
        display: none;
    }

    .results_main-lh p p {
        display: inline;
    }

    .lh-relevantmetrics strong {
        color: #555;
        font-weight: 500;
    }

    .lh-relevantmetric {
        padding: 0.3em .5em;
        font-size: .7em;
        text-transform: uppercase;
        background-color: #555;
        color: #fff;
        font-weight: normal;
        display: inline-block;
        border-radius: 0.3em;
        align-self: center;
        margin-right: 0.5em;
        line-height: 1;
    }

    details.metrics_shown p a {
        color: #fff;
    }

    .lh-filter_map {
        display: flex;
        justify-content: space-between;
        width: 100%;
        margin: 2em 0 0;
        align-items: center
    }

    a.lh-maplink {
        display: inline-block;
        border-radius: 2em;
        padding: .5em 1em;

        border: 1px solid #2a3b64;
        color: #2a3b64;
        font-size: .8em;
        font-weight: 700;
        text-decoration: none;
    }

    a.lh-maplink:hover,
    a.lh-maplink:focus {
        background-color: #2a3b64;
        color: #fff;
        border-color: transparent;
    }

    p.lh-filteraudits {
        display: flex;
        gap: .5em;
        margin: 0;
    }

    .lh-filteraudits a {
        text-transform: uppercase;
    }

    .lh-filteraudits a[aria-current] {
        text-decoration: none;
        color: #222;
        font-weight: 700;
    }

    .results_main-lh table.lh-details {
        width: 100%;
        display: table;
        font-size: .9em;

    }

    .results_main-lh table.lh-details th,
    .results_main-lh table.lh-details td {
        padding: .5em;
    }

    .results_main-lh table.lh-details th {
        padding: 1em .5em;
        border-top: 1px solid #eee;
    }

    .results_main-lh table.lh-details th:last-child,
    .results_main-lh table.lh-details td:last-child {
        text-align: right;
    }

    .results_main-lh table.lh-details tr:nth-child(odd) td {
        background: #fafafa;
    }

    .lh-chain ol {
        margin: 1em 0;
        font-size: .9em;
    }

    .lh-chain ol ol {
        margin: 1em 0 0 1em;
        font-size: 1em;
    }

    .lh-chain li {
        position: relative;
        overflow: visible;
        padding-left: 1em;
        list-style: none;
    }

    .lh-chain li li:before {
        content: "";
        position: absolute;
        height: .6em;
        width: 1em;
        left: -.5em;
        border-left: 2px solid #aaa;
        border-bottom: 2px solid #aaa;
        top: 0;
    }
</style>
@endsection

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
            </div>
            <div class="opportunities_summary">
                <ul class="results_lh_nav">
                    @foreach ($results->categories as $category)
                    <a href="#{{ $category->title}}" class="lh_score lh_score_grade-{{ gradeFromScore($category->score) }}">
                        <span class="lh_score_cat">{{ $category->title }}</span>
                        <span class="lh_score_number">
                            <svg class="lh-gauge" viewBox="0 0 120 120">
                                <circle class="lh-gauge-base" r="56" cx="60" cy="60" stroke-width="8"></circle>
                                <circle class="lh-gauge-arc" r="56" cx="60" cy="60" stroke-width="8" style="transform: rotate(-87.9537deg); stroke-dasharray: 281.005, 351.858;"></circle>
                            </svg>
                            {{ round(100 * $category->score) }}
                        </span>
                    </a>
                    @endforeach
                </ul>
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
                                        <circle class="lh-gauge-arc" r="56" cx="60" cy="60" stroke-width="8" style="transform: rotate(-87.9537deg); stroke-dasharray: 281.005, 351.858;"></circle>
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