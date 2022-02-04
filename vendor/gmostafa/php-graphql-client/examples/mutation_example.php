<?php

require_once __DIR__ . '/../vendor/autoload.php';

use GraphQL\Client;
use GraphQL\Exception\QueryError;
use GraphQL\Mutation;
use GraphQL\RawObject;

// Create Client object to contact the GraphQL endpoint
$client = new Client(
    'api_url',
    []  // Replace with array of extra headers to be sent with request for auth or other purposes
);


// Create the GraphQL mutation
$gql = (new Mutation('createCompany'))
    ->setArguments(['companyObject' => new RawObject('{name: "Trial Company", employees: 200}')])
    ->setSelectionSet(
        [
            '_id',
            'name',
            'serialNumber',
        ]
    );

// Run query to get results
try {
    $results = $client->runQuery($gql);
}
catch (QueryError $exception) {

    // Catch query error and desplay error details
    print_r($exception->getErrorDetails());
    exit;
}

// Display original response from endpoint
var_dump($results->getResponseObject());

// Display part of the returned results of the object
var_dump($results->getData()->pokemon);

// Reformat the results to an array and get the results of part of the array
$results->reformatResults(true);
print_r($results->getData()['pokemon']);