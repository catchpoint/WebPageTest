<?php

declare(strict_types=1);

namespace WebPageTest;

use IteratorAggregate;
use Traversable;
use Countable;
use ArrayIterator;
use JsonSerializable;
use WebPageTest\Plan;

/**
 *
 * @implements IteratorAggregate<Plan>
 * @implements Countable<Plan>
 *
 * */
class PlanList implements IteratorAggregate, Countable, JsonSerializable
{
    //@var array { Plan } $list
    private array $list;
    //@var array { Plan } $monthly_plans
    private array $monthly_plans;
    //@var array { Plan } $annual_plans
    private array $annual_plans;

    public function __construct(Plan ...$plans)
    {
        usort($plans, function ($a, $b) {
            if ($a->getPrice() == $b->getPrice()) {
                return 0;
            }
            return ($a->getPrice() < $b->getPrice()) ? -1 : 1;
        });

        $this->monthly_plans = [];
        $this->annual_plans = [];

        foreach ($plans as $plan) {
            if ($plan->getBillingFrequency() == "Monthly") {
                $this->monthly_plans[] = $plan;
            } else {
                $this->annual_plans[] = $plan;
            }
        }

        $this->list = $plans;
    }

    public function add(Plan $plan): void
    {
        $this->list[] = $plan;
    }

    public function getMonthlyPlans(): array
    {
        return $this->monthly_plans;
    }

    public function getAnnualPlans(): array
    {
        return $this->annual_plans;
    }

    public function getAnnualPlanByRuns(int $runs): Plan
    {
        foreach ($this->annual_plans as $plan) {
            $planRuns = $plan->getRuns();
            if ($planRuns == $runs) {
                return $plan;
                exit();
            }
        }
    }

    public function getPlanById(string $id): Plan
    {
        foreach ($this->list as $plan) {
            $planId = $plan->getId();
            if (strtolower($planId) == strtolower($id)) {
                return $plan;
            }
        }
    }

    public function toArray(): array
    {
        return $this->list;
    }

    public function getIterator(): Traversable
    {
        return new ArrayIterator($this->list);
    }

    public function count(): int
    {
        return count($this->list);
    }

    public function jsonSerialize()
    {
        return $this->list;
    }
}
