<?php declare(strict_types=1);

require_once __DIR__ . '/../../www/helpers/template.php';

use PHPUnit\Framework\TestCase;

final class TemplateTest extends TestCase {
  public function testConstructorSetsDefaults() : void {
    $dir = realpath(__DIR__ . '/../../www/templates');
    $tpl = new Template();
    $this->assertEquals($dir, $tpl->get_dir());
  }
  public function testConstructorSetsValues() : void {
    $dir = realpath(__DIR__ . '/../../www/templates/errors');
    $tpl = new Template('errors');
    $this->assertEquals($dir, $tpl->get_dir());
  }
  public function testRenderReturnsRenderedString() : void {
    $dir = realpath(__DIR__ . '/fixtures');
    $tpl = new Template('../../tests/helpers/fixtures');
    $this->assertEquals($dir, $tpl->get_dir());
    $val = $tpl->render('template-1', array(
      'name' => 'Jeff'
    ));
    $this->assertEquals("<div>Hi Jeff</div>\n", $val);
  }
}
