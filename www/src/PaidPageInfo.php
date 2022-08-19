<?php

namespace WebPageTest;

use WebPageTest\CPGraphQlTypes\ApiKeyList;
use WebPageTest\CPGraphQlTypes\Customer;

class PaidPageInfo
{
    private ApiKeyList $wpt_api_key_list;
    private Customer $wpt_customer;

    public function __construct(Customer $wpt_customer, ApiKeyList $wpt_api_key_list)
    {
        $this->wpt_customer = $wpt_customer;
        $this->wpt_api_key_list = $wpt_api_key_list;
    }

    public function getCustomer(): Customer
    {
        return $this->wpt_customer;
    }

    public function getApiKeys(): ApiKeyList
    {
        return $this->wpt_api_key_list;
    }
}
