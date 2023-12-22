<?php declare(strict_types = 1);

namespace PHPStan\PhpDocParser\Ast\PhpDoc;

use PHPStan\PhpDocParser\Ast\NodeAttributes;
use PHPStan\PhpDocParser\Ast\Type\TypeNode;
use function trim;

class VarTagValueNode implements PhpDocTagValueNode
{

	use NodeAttributes;

	/** @var TypeNode */
	public $type;

	/** @var string (may be empty) */
	public $variableName;

	/** @var string (may be empty) */
	public $description;

	public function __construct(TypeNode $type, string $variableName, string $description)
	{
		$this->type = $type;
		$this->variableName = $variableName;
		$this->description = $description;
	}


	public function __toString(): string
	{
		return trim("$this->type " . trim("{$this->variableName} {$this->description}"));
	}

}
