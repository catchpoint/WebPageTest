<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;
use WebPageTest\Template;

final class TemplateTest extends TestCase
{
    public function testConstructorSetsDefaults(): void
    {
        $dir = realpath(__DIR__ . '/../www/templates');
        $layout = realpath(__DIR__ . '/../www/templates/layouts/default.php');
        $tpl = new Template();
        $this->assertEquals($dir, $tpl->getDir());
        $this->assertEquals($layout, $tpl->getLayout());
    }
    public function testConstructorSetsValues(): void
    {
        $dir = realpath(__DIR__ . '/../www/templates/errors');
        $layout = realpath(__DIR__ . '/../www/templates/layouts/default.php');
        $tpl = new Template('errors');
        $this->assertEquals($dir, $tpl->getDir());
        $this->assertEquals($layout, $tpl->getLayout());
    }
    public function testSetLayout(): void
    {
        $tpl = new Template();
        $tpl->setLayout('../../../tests/fixtures/layout-1');
        $layout = realpath(__DIR__ . '/fixtures/layout-1.php');
        $this->assertEquals($tpl->getLayout(), $layout);
    }

    public function testRenderReturnsRenderedString(): void
    {
        $dir = realpath(__DIR__ . '/fixtures');
        $tpl = new Template('../../tests/fixtures');
        $tpl->setLayout('../../../tests/fixtures/layout-1');
        $this->assertEquals($dir, $tpl->getDir());
        $val = $tpl->render('template-1', array(
            'name' => 'Jeff'
        ));
        $expected = "<!DOCTYPE html>
<html>
  <head>
  </head>
  <body>
    <div>Hi Jeff</div>
  </body>
</html>
";
        $this->assertEquals($expected, $val);
    }
}
