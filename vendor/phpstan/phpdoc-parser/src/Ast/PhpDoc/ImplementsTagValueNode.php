<?php declare(strict_types = 1);

namespace PHPStan\PhpDocParser\Ast\PhpDoc;

use PHPStan\PhpDocParser\Ast\NodeAttributes;
use PHPStan\PhpDocParser\Ast\Type\GenericTypeNode;
use function trim;

class ImplementsTagValueNode implements PhpDocTagValueNode
{

	use NodeAttributes;

	/** @var GenericTypeNode */
	public $type;

	/** @var string (may be empty) */
	public $description;

	public function __construct(GenericTypeNode $type, string $description)
	{
		$this->type = $type;
		$this->description = $description;
	}


	public function __toString(): string
	{
		return trim("{$this->type} {$this->description}");
	}

}
