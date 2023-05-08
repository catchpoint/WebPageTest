@extends('default')

@section('content')
<img src="/assets/images/src/energyimpact-sky.svg" class="ei_sky" alt="">
<div class="results_main_contain">
    <div class="results_main">
        <div class="results_and_command">
            <div class="results_header">
                <h2>
                Carbon Control<em class="flag">Experimental</em>
                </h2>
                <p>WebPageTest evaluates a website's carbon usage through the use of services such as the <a href="https://www.thegreenwebfoundation.org/">Green Web Foundation’s</a> <em>Green Web Dataset</em> and <em>CO2.js</em> </p>
                <p class="ei_runrepeat">Displaying Test Run {{$run}}@if ($cached), Repeat View @else . @endif</p>

                <div class="ei_summary">
                    @if ($has_ei_results)

                    <div class="ei_summary_hosting">
                        <h3 class="hed_sub">Green Hosting Check</h3>
                        <ul>
                            <li>
                                <div class="ei_summary_hosting_info">
                                    <h4>Primary Domain</h4>
                                    <p>
                                    @if ($green_hosting[0]['error'] )
                                    {{$green_hosting[0]['error']}}
                                    @else   
                                    Origin: 
                                    {{$green_hosting[0]['url']}}
                                    @endif</p>
                                </div>
                                @if( $green_hosting[0]['green'] )
                                <img src="/assets/images/src/icon_tree.svg" alt="Green-Hosted">
                                @else
                                <img src="/assets/images/src/icon_grading_alert.svg" alt="Not Green Hosted">
                                @endif
                            </li>
                            <li>
                                <div class="ei_summary_hosting_info">
                                    <h4>3rd Party Domains</h4>
                                    @php ($hosts_total = count($green_hosting)-1)
                                    @php ($hosts_green = 0)
                                    @foreach ($green_hosting as $hostitem => $host)
                                        @if( $hostitem > 0 && $host['green'] )
                                            @php ($hosts_green += 1)
                                        @endif
                                    @endforeach
                                    @if ($hosts_total > 0)
                                    <details>
                                        <summary><em>{{$hosts_green}} of {{$hosts_total}}</em> green-hosted</summary>
                                        <div>
                                            <table>
                                                <tr>
                                                <th>Host</th>
                                                <th>Green?</th>
                                                </tr>
                                                @foreach ($green_hosting as $hostitem => $host)
                                                    @if($hostitem > 0)
                                                    <tr>
                                                    <th>{{ $host['url'] }}</th>
                                                    <td>@if ($host['green']) 
                                                        <img src="/assets/images/src/icon_grading_check.svg" alt="Yes">
                                                        @else
                                                        <img src="/assets/images/src/icon_grading_alert.svg" alt="No">
                                                        @endif
                                                    </td>
                                                    </tr>
                                                    @endif
                                                @endforeach
                                            </table>
                                        </div>
                                    </details>
                                    @elseif  ($green_hosting[0]['error'] )
                                        <p>{{$green_hosting[0]['error']}}</p>
                                    @else
                                        <p>No third party hosts detected.</p>
                                    @endif
                                </div>
                                @if( $hosts_total === 0 || $hosts_total === $hosts_green )
                                <img src="/assets/images/src/icon_tree.svg" alt="Green-Hosted">
                                @else
                                <img src="/assets/images/src/icon_grading_alert.svg" alt="Not Green Hosted">
                                @endif
                            </li>
                        </ul>
                    </div>
                    <div class="ei_summary_metrics">
                        <h3 class="hed_sub">Estimated Carbon Footprint</h3>
                        <div class="scrollableTable">
                                <table id="tableResults" class="pretty">
                                    <tbody>
                                        <tr class="metric_labels">
                                            <th>Page Weight</th>
                                            <th><abbr title="carbon dioxide equivalent">CO<sub>2</sub>e</abbr> {{$carbon_footprint['scale']}}</th>
                                        </tr>
                                        <tr>
                                            <td>{{$pageweight_total}}<span class="units">{{$pageweight_units}}</span></td>
                                            <td>{{$carbon_footprint['sustainable-web-design']}}<span class="units">g</span></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                    </div>
                    @endif
                </div>
            </div>
            
        </div>
       
        <div id="result" class="results_body">
            <div id="average">
                <div class='experiments_grades'>
                    <div class="form_clip">
                        @if ($has_ei_results)
                        <h3 class="hed_sub">Your Footprint, in Context... <em>(Using <a href="https://developers.thegreenwebfoundation.org/co2js/explainer/methodologies-for-calculating-website-carbon/#the-sustainable-web-design-model">Sustainable Web Design</a> Model)</em></h3>
                        <div class="ei_diagnostics ei_diagnostics-context">
                            <ul>
                            @php ($avgSiteCarbon = 0.6)
                            @php ($avgMileCarbon = 404)
                            @php ( $mileCompare = round($avgMileCarbon / $carbon_footprint['sustainable-web-design']))
                            
                            @php ($mileAvg = ($avgSiteCarbon + $carbon_footprint['sustainable-web-design']) / 2 )
                            @php ( $footCompare =  round( ( abs($avgSiteCarbon - $carbon_footprint['sustainable-web-design'] ) /  $avgSiteCarbon  ) * 100 ))

                            @if ($footCompare === 0)
                                @php ($footCompare = "<strong>the same amount</strong>")
                            @elseif ($carbon_footprint['sustainable-web-design'] > $avgSiteCarbon)
                                @php ($footCompare = "<strong>$footCompare% more</strong> than that")
                            @else 
                                @php ($footCompare = "<strong>$footCompare% less</strong> than that")
                            @endif 
                                <li>
                                    <span>The average passenger vehicle emits <strong>{{ $avgMileCarbon }} grams of CO2 per mile</strong>*. This website emits that amount of CO2 <strong>every {{ $mileCompare }} visits</strong>. <small>* Source: <a href="https://www.epa.gov/greenvehicles/greenhouse-gas-emissions-typical-passenger-vehicle#:~:text=typical%20passenger%20vehicle%3F-,A%20typical%20passenger%20vehicle%20emits%20about%204.6%20metric%20tons%20of,8%2C887%20grams%20of%20CO2.">US EPA</a></small></span>
                                    <img src="/assets/images/src/env-car.svg" alt="car with exhaust sketch"> 
                                </li>
                                <li>
                                    <span>The median CO2 footprint of the top 1000 websites is <strong>{{ $avgSiteCarbon }} grams per visit</strong>*. This website emits {!! $footCompare !!} per visit. <small>* Source: <a href="https://almanac.httparchive.org/en/2022/">2022 Web Almanac</a></small></span>
                                    <img src="/assets/images/src/env-scale.svg" alt="scales with servers in them sketch"> 
                                </li>
                                <li>
                                    <span>A site's carbon footprint can vary by device and location, particularly if it relies on 3rd party ads. <a href="/carbon-control/?url={{ $test_url }}">Test this site from another country</a> to see how its footprint varies.</span>
                                    <img src="/assets/images/src/icon_routes.svg" alt="planet with arrows on it sketch"> 
                                </li>
                            </ul>
                        </div>


                        <p class="try-exps"><span class="opportunities_summary_exps">WebPageTest Pro experiments can help you improve your footprint! <a href="{{ $opps_url }}">Try them now!</a></span></p>


                       <h3 class="hed_sub">Impactful Practices Quick-Check <em>(See <a href="{{ $opps_url }}">Opportunities & Experiments</a> for details)</em></h3>

                        <div class="ei_diagnostics">
                            <ul>
                                <li class="ei_diagnostics_item-textcompression ei_diagnostics_item-{{$practices['gzip_score']}}">
                                    <h5>Text Compression</h5>
                                    @if ($practices['gzip_score_num'] === 100)
                                    <p>All text files were transferred with compression, reducing page weight.</p>
                                    @else
                                    <p>{{$practices['gzip_savings']}}KB of {{$practices['gzip_total']}}KB total text was transferred compressed. {{$practices['gzip_target']}}KB was uncompressed.</p>
                                    @endif
                                </li>
                                <li class="ei_diagnostics_item-unusedpreloads ei_diagnostics_item-{{$practices['unused_preloads_score']}}">
                                    <h5>Unused Preloads</h5>
                                    @if ($practices['unused_preloads_total'] === 0)
                                    <p>Zero files were preloaded without later reuse.</p>
                                    @else
                                    <p>{{$practices['unused_preloads_total']}} file{{ $practices['unused_preloads_total'] > 1 ? 's were' : ' was' }} preloaded but never used, increasing page weight.

                                    <a href="{{ $opps_url }}#experiment-022" class="ei_diagnostics_item-experiments"><span class="opportunities_summary_exps"></span>Relevant Experiments</a>
                                    </p>
                                    @endif
                                </li>
                                <li class="ei_diagnostics_item-lazyloading ei_diagnostics_item-{{$practices['images_need_lazy_score']}}">
                                    <h5>Lazy Loading</h5>
                                    @if ($practices['images_need_lazy_total'] === 0)
                                    <p>Zero images were found that could potentially be lazy-loaded.</p>
                                    @else
                                    <p>{{$practices['images_need_lazy_total']}} image{{ $practices['images_need_lazy_total'] > 1 ? 's were' : ' was' }} hidden at page load and could possibly be lazy-loaded to reduce potential page weight.
                                    <a href="{{ $opps_url }}#experiment-014" class="ei_diagnostics_item-experiments"><span class="opportunities_summary_exps"></span>Relevant Experiments</a>

                                    </p>
                                    @endif
                                </li>
                                <!-- <li class="ei_diagnostics_item-memoryusage ei_diagnostics_item-{{$practices['minify_score']}}">
                                    <h5>Minification</h5>
                                    @if ($practices['minify_score_num'] === 100)
                                    <p>All text files were transferred minified, reducing page weight.</p>
                                    @else
                                    <p>This site minified {{$practices['minify_savings']}}KB of text of {{$practices['minify_total']}}KB. {{$practices['minify_target']}}KB were not minified.</p>
                                    @endif
                                </li> -->
                                <li class="ei_diagnostics_item-imagecompression ei_diagnostics_item-{{$practices['images_score']}}">
                                    <h5>Image Compression</h5>
                                    @if ($practices['images_score_num'] === 100)
                                    <p>All image files were transferred with compression, reducing page weight.</p>
                                    @else
                                    <p>{{$practices['images_savings']}}KB out of {{$practices['images_total']}}KB image requests were compressed. {{$practices['images_target']}}KB were unoptimized. </p>
                                    @endif
                                </li>
                                <li class="ei_diagnostics_item-caching ei_diagnostics_item-{{$practices['cache_score']}}">
                                    <h5>Caching</h5>
                                    @if ($practices['images_score_num'] === 100)
                                    <p>All files were delivered with helpful cache-control settings for low-impact reuse.</p>
                                    @else
                                    <p>About {{$practices['cache_score_num']}}% of assets were delivered with helpful cache-control settings.</p>
                                    @endif
                                </li>
                                <li class="ei_diagnostics_item-cdnusage ei_diagnostics_item-{{$practices['cdn_score']}}">
                                    <h5>CDN Usage</h5>
                                    @if ($practices['cdn_score_num'] === 100)
                                    <p>All files were served via CDN, reducing energy usage in transmitting files long distances.</p>
                                    @else
                                    <p>About {{$practices['cdn_score_num']}}% of assets were served via CDN.</p>
                                    @endif
                                </li>
                               
                        </ul>
                        </div>

                       
                        <div class="ei_supporting">
                            <div class="ei_requests">
                                <h3 class="hed_sub">Carbon Control by Resource Type</h3>
                                <div class="pie">
                                    <ul class="pie_key">
                                    @foreach ($resource_impact as $item)
                                        <li style="background-color: {{$item[2]}}">{{$item[0]}}: {{$item[3]}}%</li>
                                    @endforeach
                                    </ul>
                                    <svg  viewBox='0 0 20 20'>
                                        <g transform='rotate(-90 10 10)' fill='none' stroke-width='10'>
                                            @php ($rotate = 0)
                                            @foreach ($resource_impact as $item)
                                            @php ($deg = $item[1] * .3142)
                                            <circle data-label="{{$item[0]}}" r='5' cx='10' cy='10' stroke="{{$item[2]}}" stroke-dasharray='{{$deg}} 31.42' transform="rotate({{$rotate}} 10 10)"></circle>
                                            @php ($rotate += ($deg / 31.42) * 360)
                                            @endforeach
                                        </g>
                                        <circle cx='10' cy='10' stroke="#fff" stroke-width="5" r="2"></circle>
                                    </svg>
                                </div>
                            </div>

                            <div class="ei_reduce">
                            <h3 class="hed_sub">Looking For Ways To Reduce Your Footprint?</h3>
                            <p>Check out the new <a href="{{ $opps_url }}">Opportunities & Experiments</a> section where you’ll find observations about specific issues and bottlenecks that are causing your site to be less quick, usable, resilient, or eco-friendly than it can be!</p>
                            <p><img  width="105" height="14" src="/assets/images/wpt-logo-pro-dark.svg" alt="WebPageTest Pro"> users can run no-code experiments to see the real impact of changes and optimizations on live sites, so you can know which changes are worth your time!
                            <strong>Looking to go Pro?</strong> <a href="/signup">Compare Plans</a></p>

                                <h4>Additionally, check out these excellent resources:</h4>
                                <ul>
                                    <li><a href="https://almanac.httparchive.org/en/2022/sustainability">2022 Web Almanac: Sustainability</a></li>
                                    <li><a href="https://www.thegreenwebfoundation.org/">Green Web Foundation</a></li>
                                </ul>
                            </div>
                            
                        </div>
                        <div class="ei_spread">
                        <h3 class="hed_sub">Show Your Peers That You Care!</h3>
                                <p>Spread the word that you're tracking your footprint by adding this badge to your site or social media!</p>
                                <div class="badge-info">
                                    <div class="badge-preview">
                                        <a href="/assets/images/webpagetest-carbon-control-badge-monitored.png">
                                        <img class="badge" src="/assets/images/webpagetest-carbon-control-badge-monitored.png" alt="We Monitor Our Footprint - WebPageTest Carbon Control from Catchpoint">
                                        </a>
                                    </div>
                                    <div class="badge-snip">
                                    <p>Copy the code below (<a href="/assets/images/webpagetest-carbon-control-badge-monitored.png">or download the image here</a>):</p>
                                    <pre><code>&lt;a href=&quot;https://www.webpagetest.org/carbon-control&quot;&gt;&lt;img src=&quot;https://www.webpagetest.org/assets/images/webpagetest-carbon-control-badge-monitored.png&quot; alt=&quot;We Monitor Our Footprint - WebPageTest Carbon Control from Catchpoint&quot;&gt;&lt;/a&gt;</code></pre>
                                    </div>
                                </div>
                        </div>

                        @else
                        <p class="ei_nodata">This test contains no Carbon Control data. That could mean the test was run before WebPageTest began tracking carbon footprint, or that the services that Carbon Control relies upon were not responding at test-time, or perhaps that the test is in a non-Chromium browser. </p>
                        @endif

                    </div>
                </div>

            </div>
        </div>
        
    </div>
    
</div>




@endsection
