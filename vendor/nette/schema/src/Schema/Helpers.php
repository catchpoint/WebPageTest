<?php

/**
 * This file is part of the Nette Framework (https://nette.org)
 * Copyright (c) 2004 David Grudl (https://davidgrudl.com)
 */

declare(strict_types=1);

namespace Nette\Schema;

use Nette;
use Nette\Utils\Reflection;


/**
 * @internal
 */
final class Helpers
{
	use Nette\StaticClass;

	public const PreventMerging = '_prevent_merging';
	public const PREVENT_MERGING = self::PreventMerging;


	/**
	 * Merges dataset. Left has higher priority than right one.
	 * @return array|string
	 */
	public static function merge($value, $base)
	{
		if (is_array($value) && isset($value[self::PreventMerging])) {
			unset($value[self::PreventMerging]);
			return $value;
		}

		if (is_array($value) && is_array($base)) {
			$index = 0;
			foreach ($value as $key => $val) {
				if ($key === $index) {
					$base[] = $val;
					$index++;
				} else {
					$base[$key] = static::merge($val, $base[$key] ?? null);
				}
			}

			return $base;

		} elseif ($value === null && is_array($base)) {
			return $base;

		} else {
			return $value;
		}
	}


	public static function getPropertyType(\ReflectionProperty $prop): ?string
	{
		if (!class_exists(Nette\Utils\Type::class)) {
			throw new Nette\NotSupportedException('Expect::from() requires nette/utils 3.x');
		} elseif ($type = Nette\Utils\Type::fromReflection($prop)) {
			return (string) $type;
		} elseif ($type = preg_replace('#\s.*#', '', (string) self::parseAnnotation($prop, 'var'))) {
			$class = Reflection::getPropertyDeclaringClass($prop);
			return preg_replace_callback('#[\w\\\\]+#', function ($m) use ($class) {
				return Reflection::expandClassName($m[0], $class);
			}, $type);
		}

		return null;
	}


	/**
	 * Returns an annotation value.
	 * @param  \ReflectionProperty  $ref
	 */
	public static function parseAnnotation(\Reflector $ref, string $name): ?string
	{
		if (!Reflection::areCommentsAvailable()) {
			throw new Nette\InvalidStateException('You have to enable phpDoc comments in opcode cache.');
		}

		$re = '#[\s*]@' . preg_quote($name, '#') . '(?=\s|$)(?:[ \t]+([^@\s]\S*))?#';
		if ($ref->getDocComment() && preg_match($re, trim($ref->getDocComment(), '/*'), $m)) {
			return $m[1] ?? '';
		}

		return null;
	}


	/**
	 * @param  mixed  $value
	 */
	public static function formatValue($value): string
	{
		if (is_object($value)) {
			return 'object ' . get_class($value);
		} elseif (is_string($value)) {
			return "'" . Nette\Utils\Strings::truncate($value, 15, '...') . "'";
		} elseif (is_scalar($value)) {
			return var_export($value, true);
		} else {
			return strtolower(gettype($value));
		}
	}


	public static function validateType($value, string $expected, Context $context): void
	{
		if (!Nette\Utils\Validators::is($value, $expected)) {
			$expected = str_replace(DynamicParameter::class . '|', '', $expected);
			$expected = str_replace(['|', ':'], [' or ', ' in range '], $expected);
			$context->addError(
				'The %label% %path% expects to be %expected%, %value% given.',
				Message::TypeMismatch,
				['value' => $value, 'expected' => $expected]
			);
		}
	}


	public static function validateRange($value, array $range, Context $context, string $types = ''): void
	{
		if (is_array($value) || is_string($value)) {
			[$length, $label] = is_array($value)
				? [count($value), 'items']
				: (in_array('unicode', explode('|', $types), true)
					? [Nette\Utils\Strings::length($value), 'characters']
					: [strlen($value), 'bytes']);

			if (!self::isInRange($length, $range)) {
				$context->addError(
					"The length of %label% %path% expects to be in range %expected%, %length% $label given.",
					Message::LengthOutOfRange,
					['value' => $value, 'length' => $length, 'expected' => implode('..', $range)]
				);
			}
		} elseif ((is_int($value) || is_float($value)) && !self::isInRange($value, $range)) {
			$context->addError(
				'The %label% %path% expects to be in range %expected%, %value% given.',
				Message::ValueOutOfRange,
				['value' => $value, 'expected' => implode('..', $range)]
			);
		}
	}


	public static function isInRange($value, array $range): bool
	{
		return ($range[0] === null || $value >= $range[0])
			&& ($range[1] === null || $value <= $range[1]);
	}


	public static function validatePattern(string $value, string $pattern, Context $context): void
	{
		if (!preg_match("\x01^(?:$pattern)$\x01Du", $value)) {
			$context->addError(
				"The %label% %path% expects to match pattern '%pattern%', %value% given.",
				Message::PatternMismatch,
				['value' => $value, 'pattern' => $pattern]
			);
		}
	}


	public static function getCastStrategy(string $type): \Closure
	{
		if (Nette\Utils\Reflection::isBuiltinType($type)) {
			return static function ($value) use ($type) {
				settype($value, $type);
				return $value;
			};
		} elseif (method_exists($type, '__construct')) {
			return static function ($value) use ($type) {
				if (PHP_VERSION_ID < 80000 && is_array($value)) {
					throw new Nette\NotSupportedException("Creating $type objects is supported since PHP 8.0");
				}
				return is_array($value)
					? new $type(...$value)
					: new $type($value);
			};
		} else {
			return static function ($value) use ($type) {
				$object = new $type;
				foreach ($value as $k => $v) {
					$object->$k = $v;
				}
				return $object;
			};
		}
	}
}
