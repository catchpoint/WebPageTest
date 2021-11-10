<?php declare(strict_types=1);

require_once __DIR__ . '/../../www/helpers/template.php';

use PHPUnit\Framework\TestCase;

final class TemplateTest extends TestCase {
  public function testConstructorSetsDefaults() : void {
    $dir = realpath(__DIR__ . '/../../www/templates');
    $layout = realpath(__DIR__ . '/../../www/templates/layouts/default.php');
    $tpl = new Template();
    $this->assertEquals($dir, $tpl->get_dir());
    $this->assertEquals($layout, $tpl->get_layout());
  }
  public function testConstructorSetsValues() : void {
    $dir = realpath(__DIR__ . '/../../www/templates/errors');
    $layout = realpath(__DIR__ . '/../../www/templates/layouts/default.php');
    $tpl = new Template('errors');
    $this->assertEquals($dir, $tpl->get_dir());
    $this->assertEquals($layout, $tpl->get_layout());
  }
  public function testSetLayout() : void {
    $tpl = new Template();
    $tpl->set_layout('../../../tests/helpers/fixtures/layout-1');
    $layout = realpath(__DIR__ . '/fixtures/layout-1.php');
    $this->assertEquals($tpl->get_layout(), $layout);

  }

public function testRenderReturnsRenderedString() : void {
  $dir = realpath(__DIR__ . '/fixtures');
  $tpl = new Template('../../tests/helpers/fixtures');
  $tpl->set_layout('../../../tests/helpers/fixtures/layout-1');
  $this->assertEquals($dir, $tpl->get_dir());
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
