<?php declare(strict_types=1);

require_once __DIR__ . '/..' . '/www/waterfall.inc';

use PHPUnit\Framework\TestCase;

final class WaterfallIncTest extends TestCase {
  public function testColorAlternatorConstructorSetsColorAndAltColor() : void {
    $colorAlternator = new ColorAlternator('blue', 'red');
    $this->assertEquals('blue', $colorAlternator->color);
    $this->assertEquals('red', $colorAlternator->alt_color);
    $this->assertFalse($colorAlternator->use_alt_color);
  }

  public function testColorAlternatorGetNextChangesColors() : void {
    $ca = new ColorAlternator('blue', 'red');
    $this->assertEquals('blue', $ca->getNext());
    $this->assertTrue($ca->use_alt_color);
    $this->assertEquals('red', $ca->getNext());
    $this->assertFalse($ca->use_alt_color);
  }
}
