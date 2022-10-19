<dl class="glossary">
    <dt>First Byte Time</dt>
    <dd>
        <ul>
            <li>Applicable objects: Time to First Byte for the page (back-end processing + redirects)</li>
            <li>What is checked: The target time is the time needed for the DNS, socket and SSL negotiations + 100ms.
                A single letter grade will be deducted for every 100ms beyond the target.</li>
        </ul>
    </dd>

    <dt>Keep-Alive</dt>
    <dd>
        <ul>
            <li>Applicable objects: All objects that are from a domain that serves more than one object for the page
                (i.e. if only a single object is served from a given domain it will not be checked)</li>
            <li>What is checked: The response header contains a "keep-alive" directive or the same socket was used for more than
                one object from the given host</li>
        </ul>
    </dd>
    <dt>GZIP Text</dt>
    <dd>
        <ul>
            <li>Applicable objects: All objects with a mime type of "text/*" or "*javascript*"</li>
            <li>What is checked: Transfer-encoding is checked to see if it is gzip. If it is not then the file is compressed
                and the percentage of compression
                is the result (so a page that can save 30% of the size of it's text by compressing would yield a 70% test result)</li>
        </ul>
    </dd>
    <dt>Compress Images</dt>
    <dd>
        <ul>
            <li>Applicable objects: JPEG Images</li>
            <li>What is checked: Within 10% of a photoshop quality 50 will pass, up to 50% larger will warn and anything larger than that will fail.
                The overall score is the percentage of image bytes that can be saved by re-compressing the images.</li>
        </ul>
    </dd>
    <dt>Use Progressive JPEGs</dt>
    <dd>
        <ul>
            <li>Applicable objects: All JPEG Images</li>
            <li>What is checked: Each JPEG image is checked and the resulting score is the percentage of JPEG bytes that were served as
                progressive images relative to the total JPEG bytes.</li>
        </ul>
    </dd>
    <dt>Cache Static</dt>
    <dd>
        <ul>
            <li>Applicable objects: Any non-html object with a mime type of "text/*", "*javascript*" or "image/*" that does not
                explicitly have an Expires header of 0 or -1, a cache-control header of "private",
                "no-store" or "no-cache" or a pragma header of "no-cache"</li>
            <li>What is checked: An "Expires" header is present (and is not 0 or -1) or a "cache-control: max-age" directive is present
                and set for an hour or greater. If the expiration is set for less 7 days you will get a warning.
                If the expiration is set for less than 1 hour you will get a failure. This only applies to max-age currently.</li>
        </ul>
    </dd>
    <dt>Use A CDN</dt>
    <dd>
        <ul>
            <li>Applicable objects: All static non-html content (css, js and images)</li>
            <li>What is checked: Checked to see if it is hosted on a known CDN (CNAME mapped to a known CDN network).
                80% of the static resources need to be served from a CDN for the overall page to be considered using a CDN.
                The current list of known CDN's is
                <a href="https://github.com/WPO-Foundation/wptagent/blob/master/internal/optimization_checks.py#L48">here</a>.
            </li>
        </ul>
    </dd>
</dl>