<?php

declare(strict_types=1);

namespace WebPageTest;

use WebPageTest\PlanList;

class PlanListSet
{
    private PlanList $all_plans;
    private PlanList $current_plans;

    public function __construct()
    {
        $this->all_plans = new PlanList();
        $this->current_plans = new PlanList();
    }

    public function setAllPlans(PlanList $all_plans): void
    {
        $this->all_plans = $all_plans;
    }

    public function setCurrentPlans(PlanList $current_plans): void
    {
        $this->current_plans = $current_plans;
    }

    public function getAllPlans(): PlanList
    {
        return $this->all_plans;
    }

    public function getCurrentPlans(): PlanList
    {
        return $this->current_plans;
    }
}
