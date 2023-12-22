<?php declare(strict_types = 1);

namespace PHPStan\PhpDocParser\Parser;

use LogicException;
use PHPStan\PhpDocParser\Ast;
use PHPStan\PhpDocParser\Lexer\Lexer;
use function in_array;
use function str_replace;
use function strlen;
use function strpos;
use function substr_compare;
use function trim;

class TypeParser
{

	/** @var ConstExprParser|null */
	private $constExprParser;

	/** @var bool */
	private $quoteAwareConstExprString;

	/** @var bool */
	private $useLinesAttributes;

	/** @var bool */
	private $useIndexAttributes;

	/**
	 * @param array{lines?: bool, indexes?: bool} $usedAttributes
	 */
	public function __construct(
		?ConstExprParser $constExprParser = null,
		bool $quoteAwareConstExprString = false,
		array $usedAttributes = []
	)
	{
		$this->constExprParser = $constExprParser;
		$this->quoteAwareConstExprString = $quoteAwareConstExprString;
		$this->useLinesAttributes = $usedAttributes['lines'] ?? false;
		$this->useIndexAttributes = $usedAttributes['indexes'] ?? false;
	}

	/** @phpstan-impure */
	public function parse(TokenIterator $tokens): Ast\Type\TypeNode
	{
		$startLine = $tokens->currentTokenLine();
		$startIndex = $tokens->currentTokenIndex();
		if ($tokens->isCurrentTokenType(Lexer::TOKEN_NULLABLE)) {
			$type = $this->parseNullable($tokens);

		} else {
			$type = $this->parseAtomic($tokens);

			if ($tokens->isCurrentTokenType(Lexer::TOKEN_UNION)) {
				$type = $this->parseUnion($tokens, $type);

			} elseif ($tokens->isCurrentTokenType(Lexer::TOKEN_INTERSECTION)) {
				$type = $this->parseIntersection($tokens, $type);
			}
		}

		return $this->enrichWithAttributes($tokens, $type, $startLine, $startIndex);
	}

	/**
	 * @internal
	 * @template T of Ast\Node
	 * @param T $type
	 * @return T
	 */
	public function enrichWithAttributes(TokenIterator $tokens, Ast\Node $type, int $startLine, int $startIndex): Ast\Node
	{
		if ($this->useLinesAttributes) {
			$type->setAttribute(Ast\Attribute::START_LINE, $startLine);
			$type->setAttribute(Ast\Attribute::END_LINE, $tokens->currentTokenLine());
		}

		if ($this->useIndexAttributes) {
			$type->setAttribute(Ast\Attribute::START_INDEX, $startIndex);
			$type->setAttribute(Ast\Attribute::END_INDEX, $tokens->endIndexOfLastRelevantToken());
		}

		return $type;
	}

	/** @phpstan-impure */
	private function subParse(TokenIterator $tokens): Ast\Type\TypeNode
	{
		$startLine = $tokens->currentTokenLine();
		$startIndex = $tokens->currentTokenIndex();

		if ($tokens->isCurrentTokenType(Lexer::TOKEN_NULLABLE)) {
			$type = $this->parseNullable($tokens);

		} elseif ($tokens->isCurrentTokenType(Lexer::TOKEN_VARIABLE)) {
			$type = $this->parseConditionalForParameter($tokens, $tokens->currentTokenValue());

		} else {
			$type = $this->parseAtomic($tokens);

			if ($tokens->isCurrentTokenValue('is')) {
				$type = $this->parseConditional($tokens, $type);
			} else {
				$tokens->tryConsumeTokenType(Lexer::TOKEN_PHPDOC_EOL);

				if ($tokens->isCurrentTokenType(Lexer::TOKEN_UNION)) {
					$type = $this->subParseUnion($tokens, $type);

				} elseif ($tokens->isCurrentTokenType(Lexer::TOKEN_INTERSECTION)) {
					$type = $this->subParseIntersection($tokens, $type);
				}
			}
		}

		return $this->enrichWithAttributes($tokens, $type, $startLine, $startIndex);
	}


	/** @phpstan-impure */
	private function parseAtomic(TokenIterator $tokens): Ast\Type\TypeNode
	{
		$startLine = $tokens->currentTokenLine();
		$startIndex = $tokens->currentTokenIndex();

		if ($tokens->tryConsumeTokenType(Lexer::TOKEN_OPEN_PARENTHESES)) {
			$tokens->tryConsumeTokenType(Lexer::TOKEN_PHPDOC_EOL);
			$type = $this->subParse($tokens);
			$tokens->tryConsumeTokenType(Lexer::TOKEN_PHPDOC_EOL);

			$tokens->consumeTokenType(Lexer::TOKEN_CLOSE_PARENTHESES);

			if ($tokens->isCurrentTokenType(Lexer::TOKEN_OPEN_SQUARE_BRACKET)) {
				$type = $this->tryParseArrayOrOffsetAccess($tokens, $type);
			}

			return $this->enrichWithAttributes($tokens, $type, $startLine, $startIndex);
		}

		if ($tokens->tryConsumeTokenType(Lexer::TOKEN_THIS_VARIABLE)) {
			$type = $this->enrichWithAttributes($tokens, new Ast\Type\ThisTypeNode(), $startLine, $startIndex);

			if ($tokens->isCurrentTokenType(Lexer::TOKEN_OPEN_SQUARE_BRACKET)) {
				$type = $this->tryParseArrayOrOffsetAccess($tokens, $type);
			}

			return $this->enrichWithAttributes($tokens, $type, $startLine, $startIndex);
		}

		$currentTokenValue = $tokens->currentTokenValue();
		$tokens->pushSavePoint(); // because of ConstFetchNode
		if ($tokens->tryConsumeTokenType(Lexer::TOKEN_IDENTIFIER)) {
			$type = $this->enrichWithAttributes($tokens, new Ast\Type\IdentifierTypeNode($currentTokenValue), $startLine, $startIndex);

			if (!$tokens->isCurrentTokenType(Lexer::TOKEN_DOUBLE_COLON)) {
				$tokens->dropSavePoint(); // because of ConstFetchNode
				if ($tokens->isCurrentTokenType(Lexer::TOKEN_OPEN_ANGLE_BRACKET)) {
					$tokens->pushSavePoint();

					$isHtml = $this->isHtml($tokens);
					$tokens->rollback();
					if ($isHtml) {
						return $type;
					}

					$type = $this->parseGeneric($tokens, $type);

					if ($tokens->isCurrentTokenType(Lexer::TOKEN_OPEN_SQUARE_BRACKET)) {
						$type = $this->tryParseArrayOrOffsetAccess($tokens, $type);
					}
				} elseif ($tokens->isCurrentTokenType(Lexer::TOKEN_OPEN_PARENTHESES)) {
					$type = $this->tryParseCallable($tokens, $type);

				} elseif ($tokens->isCurrentTokenType(Lexer::TOKEN_OPEN_SQUARE_BRACKET)) {
					$type = $this->tryParseArrayOrOffsetAccess($tokens, $type);

				} elseif (in_array($type->name, ['array', 'list', 'object'], true) && $tokens->isCurrentTokenType(Lexer::TOKEN_OPEN_CURLY_BRACKET) && !$tokens->isPrecededByHorizontalWhitespace()) {
					if ($type->name === 'object') {
						$type = $this->parseObjectShape($tokens);
					} else {
						$type = $this->parseArrayShape($tokens, $type, $type->name);
					}

					if ($tokens->isCurrentTokenType(Lexer::TOKEN_OPEN_SQUARE_BRACKET)) {
						$type = $this->tryParseArrayOrOffsetAccess(
							$tokens,
							$this->enrichWithAttributes($tokens, $type, $startLine, $startIndex)
						);
					}
				}

				return $this->enrichWithAttributes($tokens, $type, $startLine, $startIndex);
			} else {
				$tokens->rollback(); // because of ConstFetchNode
			}
		} else {
			$tokens->dropSavePoint(); // because of ConstFetchNode
		}

		$currentTokenValue = $tokens->currentTokenValue();
		$currentTokenType = $tokens->currentTokenType();
		$currentTokenOffset = $tokens->currentTokenOffset();
		$currentTokenLine = $tokens->currentTokenLine();

		if ($this->constExprParser === null) {
			throw new ParserException(
				$currentTokenValue,
				$currentTokenType,
				$currentTokenOffset,
				Lexer::TOKEN_IDENTIFIER,
				null,
				$currentTokenLine
			);
		}

		try {
			$constExpr = $this->constExprParser->parse($tokens, true);
			if ($constExpr instanceof Ast\ConstExpr\ConstExprArrayNode) {
				throw new ParserException(
					$currentTokenValue,
					$currentTokenType,
					$currentTokenOffset,
					Lexer::TOKEN_IDENTIFIER,
					null,
					$currentTokenLine
				);
			}

			return $this->enrichWithAttributes($tokens, new Ast\Type\ConstTypeNode($constExpr), $startLine, $startIndex);
		} catch (LogicException $e) {
			throw new ParserException(
				$currentTokenValue,
				$currentTokenType,
				$currentTokenOffset,
				Lexer::TOKEN_IDENTIFIER,
				null,
				$currentTokenLine
			);
		}
	}


	/** @phpstan-impure */
	private function parseUnion(TokenIterator $tokens, Ast\Type\TypeNode $type): Ast\Type\TypeNode
	{
		$types = [$type];

		while ($tokens->tryConsumeTokenType(Lexer::TOKEN_UNION)) {
			$types[] = $this->parseAtomic($tokens);
		}

		return new Ast\Type\UnionTypeNode($types);
	}


	/** @phpstan-impure */
	private function subParseUnion(TokenIterator $tokens, Ast\Type\TypeNode $type): Ast\Type\TypeNode
	{
		$types = [$type];

		while ($tokens->tryConsumeTokenType(Lexer::TOKEN_UNION)) {
			$tokens->tryConsumeTokenType(Lexer::TOKEN_PHPDOC_EOL);
			$types[] = $this->parseAtomic($tokens);
			$tokens->tryConsumeTokenType(Lexer::TOKEN_PHPDOC_EOL);
		}

		return new Ast\Type\UnionTypeNode($types);
	}


	/** @phpstan-impure */
	private function parseIntersection(TokenIterator $tokens, Ast\Type\TypeNode $type): Ast\Type\TypeNode
	{
		$types = [$type];

		while ($tokens->tryConsumeTokenType(Lexer::TOKEN_INTERSECTION)) {
			$types[] = $this->parseAtomic($tokens);
		}

		return new Ast\Type\IntersectionTypeNode($types);
	}


	/** @phpstan-impure */
	private function subParseIntersection(TokenIterator $tokens, Ast\Type\TypeNode $type): Ast\Type\TypeNode
	{
		$types = [$type];

		while ($tokens->tryConsumeTokenType(Lexer::TOKEN_INTERSECTION)) {
			$tokens->tryConsumeTokenType(Lexer::TOKEN_PHPDOC_EOL);
			$types[] = $this->parseAtomic($tokens);
			$tokens->tryConsumeTokenType(Lexer::TOKEN_PHPDOC_EOL);
		}

		return new Ast\Type\IntersectionTypeNode($types);
	}


	/** @phpstan-impure */
	private function parseConditional(TokenIterator $tokens, Ast\Type\TypeNode $subjectType): Ast\Type\TypeNode
	{
		$tokens->consumeTokenType(Lexer::TOKEN_IDENTIFIER);

		$negated = false;
		if ($tokens->isCurrentTokenValue('not')) {
			$negated = true;
			$tokens->consumeTokenType(Lexer::TOKEN_IDENTIFIER);
		}

		$targetType = $this->parse($tokens);

		$tokens->tryConsumeTokenType(Lexer::TOKEN_PHPDOC_EOL);
		$tokens->consumeTokenType(Lexer::TOKEN_NULLABLE);
		$tokens->tryConsumeTokenType(Lexer::TOKEN_PHPDOC_EOL);

		$ifType = $this->parse($tokens);

		$tokens->tryConsumeTokenType(Lexer::TOKEN_PHPDOC_EOL);
		$tokens->consumeTokenType(Lexer::TOKEN_COLON);
		$tokens->tryConsumeTokenType(Lexer::TOKEN_PHPDOC_EOL);

		$elseType = $this->subParse($tokens);

		return new Ast\Type\ConditionalTypeNode($subjectType, $targetType, $ifType, $elseType, $negated);
	}

	/** @phpstan-impure */
	private function parseConditionalForParameter(TokenIterator $tokens, string $parameterName): Ast\Type\TypeNode
	{
		$tokens->consumeTokenType(Lexer::TOKEN_VARIABLE);
		$tokens->consumeTokenValue(Lexer::TOKEN_IDENTIFIER, 'is');

		$negated = false;
		if ($tokens->isCurrentTokenValue('not')) {
			$negated = true;
			$tokens->consumeTokenType(Lexer::TOKEN_IDENTIFIER);
		}

		$targetType = $this->parse($tokens);

		$tokens->tryConsumeTokenType(Lexer::TOKEN_PHPDOC_EOL);
		$tokens->consumeTokenType(Lexer::TOKEN_NULLABLE);
		$tokens->tryConsumeTokenType(Lexer::TOKEN_PHPDOC_EOL);

		$ifType = $this->parse($tokens);

		$tokens->tryConsumeTokenType(Lexer::TOKEN_PHPDOC_EOL);
		$tokens->consumeTokenType(Lexer::TOKEN_COLON);
		$tokens->tryConsumeTokenType(Lexer::TOKEN_PHPDOC_EOL);

		$elseType = $this->subParse($tokens);

		return new Ast\Type\ConditionalTypeForParameterNode($parameterName, $targetType, $ifType, $elseType, $negated);
	}


	/** @phpstan-impure */
	private function parseNullable(TokenIterator $tokens): Ast\Type\TypeNode
	{
		$tokens->consumeTokenType(Lexer::TOKEN_NULLABLE);

		$type = $this->parseAtomic($tokens);

		return new Ast\Type\NullableTypeNode($type);
	}

	/** @phpstan-impure */
	public function isHtml(TokenIterator $tokens): bool
	{
		$tokens->consumeTokenType(Lexer::TOKEN_OPEN_ANGLE_BRACKET);

		if (!$tokens->isCurrentTokenType(Lexer::TOKEN_IDENTIFIER)) {
			return false;
		}

		$htmlTagName = $tokens->currentTokenValue();

		$tokens->next();

		if (!$tokens->tryConsumeTokenType(Lexer::TOKEN_CLOSE_ANGLE_BRACKET)) {
			return false;
		}

		$endTag = '</' . $htmlTagName . '>';
		$endTagSearchOffset = - strlen($endTag);

		while (!$tokens->isCurrentTokenType(Lexer::TOKEN_END)) {
			if (
				(
					$tokens->tryConsumeTokenType(Lexer::TOKEN_OPEN_ANGLE_BRACKET)
					&& strpos($tokens->currentTokenValue(), '/' . $htmlTagName . '>') !== false
				)
				|| substr_compare($tokens->currentTokenValue(), $endTag, $endTagSearchOffset) === 0
			) {
				return true;
			}

			$tokens->next();
		}

		return false;
	}

	/** @phpstan-impure */
	public function parseGeneric(TokenIterator $tokens, Ast\Type\IdentifierTypeNode $baseType): Ast\Type\GenericTypeNode
	{
		$tokens->consumeTokenType(Lexer::TOKEN_OPEN_ANGLE_BRACKET);

		$startLine = $baseType->getAttribute(Ast\Attribute::START_LINE);
		$startIndex = $baseType->getAttribute(Ast\Attribute::START_INDEX);
		$genericTypes = [];
		$variances = [];

		$isFirst = true;
		while ($isFirst || $tokens->tryConsumeTokenType(Lexer::TOKEN_COMMA)) {
			$tokens->tryConsumeTokenType(Lexer::TOKEN_PHPDOC_EOL);

			// trailing comma case
			if (!$isFirst && $tokens->isCurrentTokenType(Lexer::TOKEN_CLOSE_ANGLE_BRACKET)) {
				break;
			}
			$isFirst = false;

			[$genericTypes[], $variances[]] = $this->parseGenericTypeArgument($tokens);
			$tokens->tryConsumeTokenType(Lexer::TOKEN_PHPDOC_EOL);
		}

		$type = new Ast\Type\GenericTypeNode($baseType, $genericTypes, $variances);
		if ($startLine !== null && $startIndex !== null) {
			$type = $this->enrichWithAttributes($tokens, $type, $startLine, $startIndex);
		}

		$tokens->consumeTokenType(Lexer::TOKEN_CLOSE_ANGLE_BRACKET);

		return $type;
	}


	/**
	 * @phpstan-impure
	 * @return array{Ast\Type\TypeNode, Ast\Type\GenericTypeNode::VARIANCE_*}
	 */
	public function parseGenericTypeArgument(TokenIterator $tokens): array
	{
		$startLine = $tokens->currentTokenLine();
		$startIndex = $tokens->currentTokenIndex();
		if ($tokens->tryConsumeTokenType(Lexer::TOKEN_WILDCARD)) {
			return [
				$this->enrichWithAttributes($tokens, new Ast\Type\IdentifierTypeNode('mixed'), $startLine, $startIndex),
				Ast\Type\GenericTypeNode::VARIANCE_BIVARIANT,
			];
		}

		if ($tokens->tryConsumeTokenValue('contravariant')) {
			$variance = Ast\Type\GenericTypeNode::VARIANCE_CONTRAVARIANT;
		} elseif ($tokens->tryConsumeTokenValue('covariant')) {
			$variance = Ast\Type\GenericTypeNode::VARIANCE_COVARIANT;
		} else {
			$variance = Ast\Type\GenericTypeNode::VARIANCE_INVARIANT;
		}

		$type = $this->parse($tokens);
		return [$type, $variance];
	}


	/** @phpstan-impure */
	private function parseCallable(TokenIterator $tokens, Ast\Type\IdentifierTypeNode $identifier): Ast\Type\TypeNode
	{
		$tokens->consumeTokenType(Lexer::TOKEN_OPEN_PARENTHESES);
		$tokens->tryConsumeTokenType(Lexer::TOKEN_PHPDOC_EOL);

		$parameters = [];
		if (!$tokens->isCurrentTokenType(Lexer::TOKEN_CLOSE_PARENTHESES)) {
			$parameters[] = $this->parseCallableParameter($tokens);
			$tokens->tryConsumeTokenType(Lexer::TOKEN_PHPDOC_EOL);
			while ($tokens->tryConsumeTokenType(Lexer::TOKEN_COMMA)) {
				$tokens->tryConsumeTokenType(Lexer::TOKEN_PHPDOC_EOL);
				if ($tokens->isCurrentTokenType(Lexer::TOKEN_CLOSE_PARENTHESES)) {
					break;
				}
				$parameters[] = $this->parseCallableParameter($tokens);
				$tokens->tryConsumeTokenType(Lexer::TOKEN_PHPDOC_EOL);
			}
		}

		$tokens->consumeTokenType(Lexer::TOKEN_CLOSE_PARENTHESES);
		$tokens->consumeTokenType(Lexer::TOKEN_COLON);

		$startLine = $tokens->currentTokenLine();
		$startIndex = $tokens->currentTokenIndex();
		$returnType = $this->enrichWithAttributes($tokens, $this->parseCallableReturnType($tokens), $startLine, $startIndex);

		return new Ast\Type\CallableTypeNode($identifier, $parameters, $returnType);
	}


	/** @phpstan-impure */
	private function parseCallableParameter(TokenIterator $tokens): Ast\Type\CallableTypeParameterNode
	{
		$startLine = $tokens->currentTokenLine();
		$startIndex = $tokens->currentTokenIndex();
		$type = $this->parse($tokens);
		$isReference = $tokens->tryConsumeTokenType(Lexer::TOKEN_REFERENCE);
		$isVariadic = $tokens->tryConsumeTokenType(Lexer::TOKEN_VARIADIC);

		if ($tokens->isCurrentTokenType(Lexer::TOKEN_VARIABLE)) {
			$parameterName = $tokens->currentTokenValue();
			$tokens->consumeTokenType(Lexer::TOKEN_VARIABLE);

		} else {
			$parameterName = '';
		}

		$isOptional = $tokens->tryConsumeTokenType(Lexer::TOKEN_EQUAL);
		return $this->enrichWithAttributes(
			$tokens,
			new Ast\Type\CallableTypeParameterNode($type, $isReference, $isVariadic, $parameterName, $isOptional),
			$startLine,
			$startIndex
		);
	}


	/** @phpstan-impure */
	private function parseCallableReturnType(TokenIterator $tokens): Ast\Type\TypeNode
	{
		$startLine = $tokens->currentTokenLine();
		$startIndex = $tokens->currentTokenIndex();
		if ($tokens->isCurrentTokenType(Lexer::TOKEN_NULLABLE)) {
			return $this->parseNullable($tokens);

		} elseif ($tokens->tryConsumeTokenType(Lexer::TOKEN_OPEN_PARENTHESES)) {
			$type = $this->subParse($tokens);
			$tokens->consumeTokenType(Lexer::TOKEN_CLOSE_PARENTHESES);
			if ($tokens->isCurrentTokenType(Lexer::TOKEN_OPEN_SQUARE_BRACKET)) {
				$type = $this->tryParseArrayOrOffsetAccess($tokens, $type);
			}

			return $type;
		} elseif ($tokens->tryConsumeTokenType(Lexer::TOKEN_THIS_VARIABLE)) {
			$type = new Ast\Type\ThisTypeNode();
			if ($tokens->isCurrentTokenType(Lexer::TOKEN_OPEN_SQUARE_BRACKET)) {
				$type = $this->tryParseArrayOrOffsetAccess($tokens, $this->enrichWithAttributes(
					$tokens,
					$type,
					$startLine,
					$startIndex
				));
			}

			return $type;
		} else {
			$currentTokenValue = $tokens->currentTokenValue();
			$tokens->pushSavePoint(); // because of ConstFetchNode
			if ($tokens->tryConsumeTokenType(Lexer::TOKEN_IDENTIFIER)) {
				$type = new Ast\Type\IdentifierTypeNode($currentTokenValue);

				if (!$tokens->isCurrentTokenType(Lexer::TOKEN_DOUBLE_COLON)) {
					if ($tokens->isCurrentTokenType(Lexer::TOKEN_OPEN_ANGLE_BRACKET)) {
						$type = $this->parseGeneric(
							$tokens,
							$this->enrichWithAttributes(
								$tokens,
								$type,
								$startLine,
								$startIndex
							)
						);
						if ($tokens->isCurrentTokenType(Lexer::TOKEN_OPEN_SQUARE_BRACKET)) {
							$type = $this->tryParseArrayOrOffsetAccess($tokens, $this->enrichWithAttributes(
								$tokens,
								$type,
								$startLine,
								$startIndex
							));
						}

					} elseif ($tokens->isCurrentTokenType(Lexer::TOKEN_OPEN_SQUARE_BRACKET)) {
						$type = $this->tryParseArrayOrOffsetAccess($tokens, $this->enrichWithAttributes(
							$tokens,
							$type,
							$startLine,
							$startIndex
						));

					} elseif (in_array($type->name, ['array', 'list', 'object'], true) && $tokens->isCurrentTokenType(Lexer::TOKEN_OPEN_CURLY_BRACKET) && !$tokens->isPrecededByHorizontalWhitespace()) {
						if ($type->name === 'object') {
							$type = $this->parseObjectShape($tokens);
						} else {
							$type = $this->parseArrayShape($tokens, $this->enrichWithAttributes(
								$tokens,
								$type,
								$startLine,
								$startIndex
							), $type->name);
						}

						if ($tokens->isCurrentTokenType(Lexer::TOKEN_OPEN_SQUARE_BRACKET)) {
							$type = $this->tryParseArrayOrOffsetAccess($tokens, $this->enrichWithAttributes(
								$tokens,
								$type,
								$startLine,
								$startIndex
							));
						}
					}

					return $type;
				} else {
					$tokens->rollback(); // because of ConstFetchNode
				}
			} else {
				$tokens->dropSavePoint(); // because of ConstFetchNode
			}
		}

		$currentTokenValue = $tokens->currentTokenValue();
		$currentTokenType = $tokens->currentTokenType();
		$currentTokenOffset = $tokens->currentTokenOffset();
		$currentTokenLine = $tokens->currentTokenLine();

		if ($this->constExprParser === null) {
			throw new ParserException(
				$currentTokenValue,
				$currentTokenType,
				$currentTokenOffset,
				Lexer::TOKEN_IDENTIFIER,
				null,
				$currentTokenLine
			);
		}

		try {
			$constExpr = $this->constExprParser->parse($tokens, true);
			if ($constExpr instanceof Ast\ConstExpr\ConstExprArrayNode) {
				throw new ParserException(
					$currentTokenValue,
					$currentTokenType,
					$currentTokenOffset,
					Lexer::TOKEN_IDENTIFIER,
					null,
					$currentTokenLine
				);
			}

			$type = new Ast\Type\ConstTypeNode($constExpr);
			if ($tokens->isCurrentTokenType(Lexer::TOKEN_OPEN_SQUARE_BRACKET)) {
				$type = $this->tryParseArrayOrOffsetAccess($tokens, $this->enrichWithAttributes(
					$tokens,
					$type,
					$startLine,
					$startIndex
				));
			}

			return $type;
		} catch (LogicException $e) {
			throw new ParserException(
				$currentTokenValue,
				$currentTokenType,
				$currentTokenOffset,
				Lexer::TOKEN_IDENTIFIER,
				null,
				$currentTokenLine
			);
		}
	}


	/** @phpstan-impure */
	private function tryParseCallable(TokenIterator $tokens, Ast\Type\IdentifierTypeNode $identifier): Ast\Type\TypeNode
	{
		try {
			$tokens->pushSavePoint();
			$type = $this->parseCallable($tokens, $identifier);
			$tokens->dropSavePoint();

		} catch (ParserException $e) {
			$tokens->rollback();
			$type = $identifier;
		}

		return $type;
	}


	/** @phpstan-impure */
	private function tryParseArrayOrOffsetAccess(TokenIterator $tokens, Ast\Type\TypeNode $type): Ast\Type\TypeNode
	{
		$startLine = $type->getAttribute(Ast\Attribute::START_LINE);
		$startIndex = $type->getAttribute(Ast\Attribute::START_INDEX);
		try {
			while ($tokens->isCurrentTokenType(Lexer::TOKEN_OPEN_SQUARE_BRACKET)) {
				$tokens->pushSavePoint();

				$canBeOffsetAccessType = !$tokens->isPrecededByHorizontalWhitespace();
				$tokens->consumeTokenType(Lexer::TOKEN_OPEN_SQUARE_BRACKET);

				if ($canBeOffsetAccessType && !$tokens->isCurrentTokenType(Lexer::TOKEN_CLOSE_SQUARE_BRACKET)) {
					$offset = $this->parse($tokens);
					$tokens->consumeTokenType(Lexer::TOKEN_CLOSE_SQUARE_BRACKET);
					$tokens->dropSavePoint();
					$type = new Ast\Type\OffsetAccessTypeNode($type, $offset);

					if ($startLine !== null && $startIndex !== null) {
						$type = $this->enrichWithAttributes(
							$tokens,
							$type,
							$startLine,
							$startIndex
						);
					}
				} else {
					$tokens->consumeTokenType(Lexer::TOKEN_CLOSE_SQUARE_BRACKET);
					$tokens->dropSavePoint();
					$type = new Ast\Type\ArrayTypeNode($type);

					if ($startLine !== null && $startIndex !== null) {
						$type = $this->enrichWithAttributes(
							$tokens,
							$type,
							$startLine,
							$startIndex
						);
					}
				}
			}

		} catch (ParserException $e) {
			$tokens->rollback();
		}

		return $type;
	}


	/**
	 * @phpstan-impure
	 * @param Ast\Type\ArrayShapeNode::KIND_* $kind
	 */
	private function parseArrayShape(TokenIterator $tokens, Ast\Type\TypeNode $type, string $kind): Ast\Type\ArrayShapeNode
	{
		$tokens->consumeTokenType(Lexer::TOKEN_OPEN_CURLY_BRACKET);

		$items = [];
		$sealed = true;

		do {
			$tokens->tryConsumeTokenType(Lexer::TOKEN_PHPDOC_EOL);

			if ($tokens->tryConsumeTokenType(Lexer::TOKEN_CLOSE_CURLY_BRACKET)) {
				return new Ast\Type\ArrayShapeNode($items, true, $kind);
			}

			if ($tokens->tryConsumeTokenType(Lexer::TOKEN_VARIADIC)) {
				$sealed = false;
				$tokens->tryConsumeTokenType(Lexer::TOKEN_COMMA);
				break;
			}

			$items[] = $this->parseArrayShapeItem($tokens);

			$tokens->tryConsumeTokenType(Lexer::TOKEN_PHPDOC_EOL);
		} while ($tokens->tryConsumeTokenType(Lexer::TOKEN_COMMA));

		$tokens->tryConsumeTokenType(Lexer::TOKEN_PHPDOC_EOL);
		$tokens->consumeTokenType(Lexer::TOKEN_CLOSE_CURLY_BRACKET);

		return new Ast\Type\ArrayShapeNode($items, $sealed, $kind);
	}


	/** @phpstan-impure */
	private function parseArrayShapeItem(TokenIterator $tokens): Ast\Type\ArrayShapeItemNode
	{
		$startLine = $tokens->currentTokenLine();
		$startIndex = $tokens->currentTokenIndex();
		try {
			$tokens->pushSavePoint();
			$key = $this->parseArrayShapeKey($tokens);
			$optional = $tokens->tryConsumeTokenType(Lexer::TOKEN_NULLABLE);
			$tokens->consumeTokenType(Lexer::TOKEN_COLON);
			$value = $this->parse($tokens);
			$tokens->dropSavePoint();

			return $this->enrichWithAttributes(
				$tokens,
				new Ast\Type\ArrayShapeItemNode($key, $optional, $value),
				$startLine,
				$startIndex
			);
		} catch (ParserException $e) {
			$tokens->rollback();
			$value = $this->parse($tokens);

			return $this->enrichWithAttributes(
				$tokens,
				new Ast\Type\ArrayShapeItemNode(null, false, $value),
				$startLine,
				$startIndex
			);
		}
	}

	/**
	 * @phpstan-impure
	 * @return Ast\ConstExpr\ConstExprIntegerNode|Ast\ConstExpr\ConstExprStringNode|Ast\Type\IdentifierTypeNode
	 */
	private function parseArrayShapeKey(TokenIterator $tokens)
	{
		$startIndex = $tokens->currentTokenIndex();
		$startLine = $tokens->currentTokenLine();

		if ($tokens->isCurrentTokenType(Lexer::TOKEN_INTEGER)) {
			$key = new Ast\ConstExpr\ConstExprIntegerNode(str_replace('_', '', $tokens->currentTokenValue()));
			$tokens->next();

		} elseif ($tokens->isCurrentTokenType(Lexer::TOKEN_SINGLE_QUOTED_STRING)) {
			if ($this->quoteAwareConstExprString) {
				$key = new Ast\ConstExpr\QuoteAwareConstExprStringNode(StringUnescaper::unescapeString($tokens->currentTokenValue()), Ast\ConstExpr\QuoteAwareConstExprStringNode::SINGLE_QUOTED);
			} else {
				$key = new Ast\ConstExpr\ConstExprStringNode(trim($tokens->currentTokenValue(), "'"));
			}
			$tokens->next();

		} elseif ($tokens->isCurrentTokenType(Lexer::TOKEN_DOUBLE_QUOTED_STRING)) {
			if ($this->quoteAwareConstExprString) {
				$key = new Ast\ConstExpr\QuoteAwareConstExprStringNode(StringUnescaper::unescapeString($tokens->currentTokenValue()), Ast\ConstExpr\QuoteAwareConstExprStringNode::DOUBLE_QUOTED);
			} else {
				$key = new Ast\ConstExpr\ConstExprStringNode(trim($tokens->currentTokenValue(), '"'));
			}

			$tokens->next();

		} else {
			$key = new Ast\Type\IdentifierTypeNode($tokens->currentTokenValue());
			$tokens->consumeTokenType(Lexer::TOKEN_IDENTIFIER);
		}

		return $this->enrichWithAttributes(
			$tokens,
			$key,
			$startLine,
			$startIndex
		);
	}

	/**
	 * @phpstan-impure
	 */
	private function parseObjectShape(TokenIterator $tokens): Ast\Type\ObjectShapeNode
	{
		$tokens->consumeTokenType(Lexer::TOKEN_OPEN_CURLY_BRACKET);

		$items = [];

		do {
			$tokens->tryConsumeTokenType(Lexer::TOKEN_PHPDOC_EOL);

			if ($tokens->tryConsumeTokenType(Lexer::TOKEN_CLOSE_CURLY_BRACKET)) {
				return new Ast\Type\ObjectShapeNode($items);
			}

			$items[] = $this->parseObjectShapeItem($tokens);

			$tokens->tryConsumeTokenType(Lexer::TOKEN_PHPDOC_EOL);
		} while ($tokens->tryConsumeTokenType(Lexer::TOKEN_COMMA));

		$tokens->tryConsumeTokenType(Lexer::TOKEN_PHPDOC_EOL);
		$tokens->consumeTokenType(Lexer::TOKEN_CLOSE_CURLY_BRACKET);

		return new Ast\Type\ObjectShapeNode($items);
	}

	/** @phpstan-impure */
	private function parseObjectShapeItem(TokenIterator $tokens): Ast\Type\ObjectShapeItemNode
	{
		$startLine = $tokens->currentTokenLine();
		$startIndex = $tokens->currentTokenIndex();

		$key = $this->parseObjectShapeKey($tokens);
		$optional = $tokens->tryConsumeTokenType(Lexer::TOKEN_NULLABLE);
		$tokens->consumeTokenType(Lexer::TOKEN_COLON);
		$value = $this->parse($tokens);

		return $this->enrichWithAttributes($tokens, new Ast\Type\ObjectShapeItemNode($key, $optional, $value), $startLine, $startIndex);
	}

	/**
	 * @phpstan-impure
	 * @return Ast\ConstExpr\ConstExprStringNode|Ast\Type\IdentifierTypeNode
	 */
	private function parseObjectShapeKey(TokenIterator $tokens)
	{
		$startLine = $tokens->currentTokenLine();
		$startIndex = $tokens->currentTokenIndex();

		if ($tokens->isCurrentTokenType(Lexer::TOKEN_SINGLE_QUOTED_STRING)) {
			if ($this->quoteAwareConstExprString) {
				$key = new Ast\ConstExpr\QuoteAwareConstExprStringNode(StringUnescaper::unescapeString($tokens->currentTokenValue()), Ast\ConstExpr\QuoteAwareConstExprStringNode::SINGLE_QUOTED);
			} else {
				$key = new Ast\ConstExpr\ConstExprStringNode(trim($tokens->currentTokenValue(), "'"));
			}
			$tokens->next();

		} elseif ($tokens->isCurrentTokenType(Lexer::TOKEN_DOUBLE_QUOTED_STRING)) {
			if ($this->quoteAwareConstExprString) {
				$key = new Ast\ConstExpr\QuoteAwareConstExprStringNode(StringUnescaper::unescapeString($tokens->currentTokenValue()), Ast\ConstExpr\QuoteAwareConstExprStringNode::DOUBLE_QUOTED);
			} else {
				$key = new Ast\ConstExpr\ConstExprStringNode(trim($tokens->currentTokenValue(), '"'));
			}
			$tokens->next();

		} else {
			$key = new Ast\Type\IdentifierTypeNode($tokens->currentTokenValue());
			$tokens->consumeTokenType(Lexer::TOKEN_IDENTIFIER);
		}

		return $this->enrichWithAttributes($tokens, $key, $startLine, $startIndex);
	}

}
