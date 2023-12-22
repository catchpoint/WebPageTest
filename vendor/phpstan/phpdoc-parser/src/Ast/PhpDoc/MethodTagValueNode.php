<?php declare(strict_types = 1);

namespace PHPStan\PhpDocParser\Ast\PhpDoc;

use PHPStan\PhpDocParser\Ast\NodeAttributes;
use PHPStan\PhpDocParser\Ast\Type\TypeNode;
use function count;
use function implode;

class MethodTagValueNode implements PhpDocTagValueNode
{

	use NodeAttributes;

	/** @var bool */
	public $isStatic;

	/** @var TypeNode|null */
	public $returnType;

	/** @var string */
	public $methodName;

	/** @var TemplateTagValueNode[] */
	public $templateTypes;

	/** @var MethodTagValueParameterNode[] */
	public $parameters;

	/** @var string (may be empty) */
	public $description;

	/**
	 * @param MethodTagValueParameterNode[] $parameters
	 * @param TemplateTagValueNode[] $templateTypes
	 */
	public function __construct(bool $isStatic, ?TypeNode $returnType, string $methodName, array $parameters, string $description, array $templateTypes = [])
	{
		$this->isStatic = $isStatic;
		$this->returnType = $returnType;
		$this->methodName = $methodName;
		$this->parameters = $parameters;
		$this->description = $description;
		$this->templateTypes = $templateTypes;
	}


	public function __toString(): string
	{
		$static = $this->isStatic ? 'static ' : '';
		$returnType = $this->returnType !== null ? "{$this->returnType} " : '';
		$parameters = implode(', ', $this->parameters);
		$description = $this->description !== '' ? " {$this->description}" : '';
		$templateTypes = count($this->templateTypes) > 0 ? '<' . implode(', ', $this->templateTypes) . '>' : '';
		return "{$static}{$returnType}{$this->methodName}{$templateTypes}({$parameters}){$description}";
	}

}
