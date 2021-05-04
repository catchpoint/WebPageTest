<?php
chdir('..');
include 'common.inc';

// Recursively crawl the attributes
function CrawlSAMLAttribytes($xpath, $node, &$attributes) {
    try {
        if ($node !== false) {
            try {
                $name = $node->getAttribute('Name');
                if (isset($name) && $name !== false && strlen($name)) {
                    foreach ($xpath->query('saml:AttributeValue', $node) as $value) {
                        $attributes[$name] = $value->textContent;
                    }
                }
            } catch(Exception $e) {}
            try {
                foreach ($xpath->query('saml:Attribute', $node) as $attr) {
                    CrawlSAMLAttribytes($xpath, $attr, $attributes);
                }
            } catch(Exception $e) {}
            try {
                foreach ($xpath->query('saml:AttributeStatement', $node) as $attr) {
                    CrawlSAMLAttribytes($xpath, $attr, $attributes);
                }
            } catch(Exception $e) {}
        }
    } catch(Exception $e) {}
}

function ParseSAMLResponse($saml_response, $expected_cert_serial=null) {
    $xmlDoc = new DOMDocument();
    $xmlDoc->loadXML($saml_response);

    $xpath = new DOMXPath($xmlDoc);
    $xpath->registerNamespace('secdsig', 'http://www.w3.org/2000/09/xmldsig#');
    $xpath->registerNamespace('samlp', 'urn:oasis:names:tc:SAML:2.0:protocol');
    $xpath->registerNamespace('saml', 'urn:oasis:names:tc:SAML:2.0:assertion');

    // fetch Signature node from XML
    $query = ".//secdsig:Signature";
    $nodeset = $xpath->query($query, $xmlDoc);
    $signatureNode = $nodeset->item(0);

    // fetch SignedInfo node from XML
    $query = "./secdsig:SignedInfo";
    $nodeset = $xpath->query($query, $signatureNode);
    $signedInfoNode = $nodeset->item(0);

    // canonicalize SignedInfo using the method descried in
    // ./secdsig:SignedInfo/secdsig:CanonicalizationMethod/@Algorithm
    $signedInfoNodeCanonicalized = $signedInfoNode->C14N(true, false);

    // fetch the x509 certificate from XML
    $x509cert = $xpath->evaluate('string(./secdsig:KeyInfo/secdsig:X509Data/secdsig:X509Certificate)', $signatureNode);
    // we have to re-wrap the certificate from XML to respect the PEM standard
    $publicCert = "-----BEGIN CERTIFICATE-----\n" . trim($x509cert) . "\n-----END CERTIFICATE-----";
    // fetch public key from x509 certificate
    $cert_info = openssl_x509_parse($publicCert);
    if (!isset($expected_cert_serial) || ($expected_cert_serial == $cert_info['serialNumber'])) {
        $publicKey = openssl_pkey_get_public($publicCert);
        // fetch the signature from XML
        $encodedSignature = $xpath->evaluate('string(./secdsig:SignatureValue)', $signatureNode);
        $signature = base64_decode($encodedSignature);

        // verify the signature
        $ok = openssl_verify($signedInfoNodeCanonicalized, $signature, $publicKey, OPENSSL_ALGO_SHA256);
        if ($ok) {
            $attributes = array();
            foreach($xpath->query('/samlp:Response/saml:Assertion/saml:AttributeStatement', $xmlDoc) as $attr) {
                CrawlSAMLAttribytes($xpath, $attr, $attributes);
            }
            if (count($attributes)) {
                return $attributes;
            }
        }
    }

    return null;
}

$attributes = null;
$ok = false;
if (isset($_REQUEST['SAMLResponse'])) {
    $xml = base64_decode($_REQUEST['SAMLResponse']);
    $saml_cert_serial = GetSetting('saml_cert_serial', null);
    $attributes = ParseSAMLResponse($xml, $saml_cert_serial);
}

// Store the Account ID and email address in a signed cookie
if (isset($attributes) && is_array($attributes) && isset($attributes['emailAddress']) && isset($attributes['accountId']) && isset($attributes['contactId'])) {
    $firstName = isset($attributes['firstName']) ? $attributes['firstName'] : '';
    $lastName = isset($attributes['lastName']) ? $attributes['lastName'] : '';
    $info = base64_encode("{$attributes['accountId']}\t{$attributes['emailAddress']}\t$firstName\t$lastName\t{$attributes['contactId']}");
    $signature = SignString($info);
    $domain = '';
    if (strstr(GetSetting('host'), 'webpagetest.org'))
        $domain = ' Domain=webpagetest.org;';
    $saml_cookie = GetSetting('saml_cookie', 'samlu');
    header("Set-Cookie: $saml_cookie=$info.$signature; Path=/;$domain Max-Age=31556952; HttpOnly; SameSite=Lax");
    $ok = true;
}

// Redirect to the page they came from (or to the landing page)
$protocol = getUrlProtocol();
$url = getUrlProtocol() . '://' . $_SERVER['HTTP_HOST'] . '/';
if (isset($_COOKIE["samlsrc"])) {
    $url=base64_decode($_COOKIE["samlsrc"]);
}
if ($ok && isset($_REQUEST['returnUrl']) && parse_url($_REQUEST['returnUrl'])) {
    $url = $_REQUEST['returnUrl'];
}

header("Cache-Control: no-store, max-age=0");
header("Location: $url");
