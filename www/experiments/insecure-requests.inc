<?php

function isCertificateUrl($contentType) {
    $certificateContentTypes = [
        'application/pkcs8',
        'application/pkcs10',
        'application/pkix-cert',
        'application/pkix-crl',
        'application/pkcs7-mime',
        'application/x-x509-ca-cert',
        'application/x-x509-user-cert',
        'application/x-pem-file',
        'application/x-pkcs12',
        'application/x-pkcs7-certificates',
        'application/x-pkcs7-certreqresp'
    ];

    if (in_array($contentType, $certificateContentTypes)) {
        return true;
    }

    return false;
}

(function () {

    global $testStepResult;
    $requests = $testStepResult->getRequests();
    $insecureRequests = array();

    foreach ($requests as $request) {
        if (isset($request['is_secure']) && $request['is_secure'] == 0) {
            if (!isCertificateUrl($request['contentType'])) {
                array_push($insecureRequests, $request['full_url']);
            }
        }
    }
    $insecureRequests = array_unique($insecureRequests);

    if (count($insecureRequests) > 0) {
        $opp = [
            "title" =>  count($insecureRequests) . " resource" . (count($insecureRequests) > 1 ? "s are" : " is") . " not being loaded over a secure connection.",
            "desc" =>  "Loading requests over HTTPS necessary for ensuring data integrity, protecting users personal information, providing core critical security, and providing access to many new browser features.",
            "examples" =>  $insecureRequests,
            "good" =>  false
        ];
    } else {
        $opp = [
            "title" =>  'Zero resources were found that were loaded over an insecure connection.',
            "desc" =>  "Loading requests over HTTPS necessary for ensuring data integrity, protecting users personal information, providing core critical security, and providing access to many new browser features.",
            "examples" =>  array(),
            "good" =>  true
        ];
    }

    AssessmentRegistry::getInstance()->register(AssessmentRegistry::Resilient, $opp);
})();
