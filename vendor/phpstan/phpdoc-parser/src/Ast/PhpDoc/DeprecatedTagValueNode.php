<?php declare(strict_types = 1);

namespace PHPStan\PhpDocParser\Ast\PhpDoc;

use PHPStan\PhpDocParser\Ast\NodeAttributes;
use function trim;

class DeprecatedTagValueNode implements PhpDocTagValueNode
{

	use NodeAttributes;

	/** @var string (may be empty) */
	public $description;

	public function __construct(string $description)
	{
		$this->description = $description;
	}


	public function __toString(): string
	{
		return trim($this->description);
	}

}
