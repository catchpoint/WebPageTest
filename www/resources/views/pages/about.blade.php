@extends('default')

@section('content')

<style>
    .box.padded {
        padding: 6rem;
    }

    .centered-content {
        padding: 1rem;
        display: flex;
        flex-direction: column;
        align-items: center;

        .perf-img {
            width: 570px
        }

        .perf-img-description {
            font-style: italic;
        }
    }
</style>

<div class="about">
    <h1>About WebPageTest</h1>
    <div class="box padded">
        <p>
            At Catchpoint, we believe that slow is the new down, and our mission is to empower you to deliver the best experiences to your users, regardless of their location in the world. The world’s leading companies,
            including Forbes' top digital companies, rely on <a href="https://www.catchpoint.com/?utm_source=WPT&utm_medium=website&utm_campaign=about">Catchpoint’s enterprise Internet Performance Monitoring (IPM) platform</a> to increase their resilience by catching any issues in the Internet Stack before they impact customers, workforce, networks, website performance, applications, and APIs.
        </p>
        <p>
            At the heart of Internet Performance Management (IPM) lies the performance experienced by end users as they interact with websites and web applications. Poor user experiences drive users away, directly impacting both revenue and brand reputation. Catchpoint's 2020 acquisition of WebPageTest, created and open-sourced by Patrick Meenan in 2008, marked a significant milestone in our journey. This strategic move united the best of both worlds, merging WebPageTest's gold-standard web performance testing capabilities with Catchpoint's market-leading Internet Performance Monitoring Platform, complete with AI-powered analytics, comprehensive dashboards, and real user monitoring (RUM).
        </p>
        <div class="centered-content">
            <img class="perf-img" src="/assets/images/pat.jpg" loading="lazy" alt="Patrick Meenan at PerNow 2023">
            <p class="perf-img-description">Patrick Meenan at PerNow 2023</p>
        </div>
        <p>The WebPageTest code remains freely accessible under the Polyform Shield license, permitting its use for internal or non-competing commercial projects. Feel free to <a href="https://www.product.webpagetest.org/contact">contact us</a> if you have any questions or encounter issues. Let’s achieve internet resilience and deliver outstanding digital experiences!</p>
    </div>
</div>

@endsection