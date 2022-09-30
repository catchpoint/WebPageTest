<?php

namespace WebPageTest;

use WebPageTest\CPGraphQlTypes\ApiKeyList;
use WebPageTest\CPGraphQlTypes\EnterpriseCustomer;

class EnterprisePaidPageInfo
{
    private ApiKeyList $wpt_api_key_list;
    private EnterpriseCustomer $wpt_customer;

    public function __construct(EnterpriseCustomer $wpt_customer, ApiKeyList $wpt_api_key_list)
    {
        $this->wpt_customer = $wpt_customer;
        $this->wpt_api_key_list = $wpt_api_key_list;
    }

    public function getCustomer(): EnterpriseCustomer
    {
        return $this->wpt_customer;
    }

    public function getApiKeys(): ApiKeyList
    {
        return $this->wpt_api_key_list;
    }
}
