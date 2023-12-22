<?php declare(strict_types = 1);

namespace PHPStan\PhpDocParser\Ast\PhpDoc;

use PHPStan\PhpDocParser\Ast\NodeAttributes;
use PHPStan\PhpDocParser\Ast\Type\TypeNode;
use function trim;

class TypeAliasTagValueNode implements PhpDocTagValueNode
{

	use NodeAttributes;

	/** @var string */
	public $alias;

	/** @var TypeNode */
	public $type;

	public function __construct(string $alias, TypeNode $type)
	{
		$this->alias = $alias;
		$this->type = $type;
	}


	public function __toString(): string
	{
		return trim("{$this->alias} {$this->type}");
	}

}
