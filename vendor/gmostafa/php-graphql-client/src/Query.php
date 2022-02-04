<?php

namespace GraphQL;

use GraphQL\Exception\ArgumentException;
use GraphQL\Exception\InvalidVariableException;
use GraphQL\Util\StringLiteralFormatter;

/**
 * Class Query
 *
 * @package GraphQL
 */
class Query extends NestableObject
{
    use FieldTrait;

    /**
     * Stores the GraphQL query format
     *
     * First string is object name
     * Second string is arguments
     * Third string is selection set
     *
     * @var string
     */
    protected const QUERY_FORMAT = "%s%s%s";

    /**
     * Stores the name of the type of the operation to be executed on the GraphQL server
     *
     * @var string
     */
    protected const OPERATION_TYPE = 'query';

    /**
     * Stores the name of the operation to be run on the server
     *
     * @var string
     */
    protected $operationName;

    /**
     * Stores the object being queried for
     *
     * @var string
     */
    protected $fieldName;

    /**
     * Stores the object alias
     *
     * @var string
     */
    protected $alias;

    /**
     * Stores the list of variables to be used in the query
     *
     * @var array|Variable[]
     */
    protected $variables;

    /**
     * Stores the list of arguments used when querying data
     *
     * @var array
     */
    protected $arguments;

    /**
     * Private member that's not accessible from outside the class, used internally to deduce if query is nested or not
     *
     * @var bool
     */
    protected $isNested;

    /**
     * GQLQueryBuilder constructor.
     *
     * @param string $fieldName if no value is provided for the field name an empty query object is assumed
     * @param string $alias the alias to use for the query if required
     */
    public function __construct(string $fieldName = '', string $alias = '')
    {
        $this->fieldName     = $fieldName;
        $this->alias         = $alias;
        $this->operationName = '';
        $this->variables     = [];
        $this->arguments     = [];
        $this->selectionSet  = [];
        $this->isNested      = false;
    }

    /**
     * @param string $alias
     *
     * @return Query
     */
    public function setAlias(string $alias)
    {
        $this->alias = $alias;

        return $this;
    }

    /**
     * @param string $operationName
     *
     * @return Query
     */
    public function setOperationName(string $operationName)
    {
        if (!empty($operationName)) {
            $this->operationName = " $operationName";
        }

        return $this;
    }

    /**
     * @param array $variables
     *
     * @return Query
     */
    public function setVariables(array $variables)
    {
        $nonVarElements = array_filter($variables, function($e) {
            return !$e instanceof Variable;
        });
        if (count($nonVarElements) > 0) {
            throw new InvalidVariableException('At least one of the elements of the variables array provided is not an instance of GraphQL\\Variable');
        }

        $this->variables = $variables;

        return $this;
    }

    /**
     * Throwing exception when setting the arguments if they are incorrect because we can't throw an exception during
     * the execution of __ToString(), it's a fatal error in PHP
     *
     * @param array $arguments
     *
     * @return Query
     * @throws ArgumentException
     */
    public function setArguments(array $arguments): Query
    {
        // If one of the arguments does not have a name provided, throw an exception
        $nonStringArgs = array_filter(array_keys($arguments), function($element) {
            return !is_string($element);
        });
        if (!empty($nonStringArgs)) {
            throw new ArgumentException(
                'One or more of the arguments provided for creating the query does not have a key, which represents argument name'
            );
        }

        $this->arguments = $arguments;

        return $this;
    }

    /**
     * @return string
     */
    protected function constructVariables(): string
    {
        if (empty($this->variables)) {
            return '';
        }

        $varsString = '(';
        $first      = true;
        foreach ($this->variables as $variable) {

            // Append space at the beginning if it's not the first item on the list
            if ($first) {
                $first = false;
            } else {
                $varsString .= ' ';
            }

            // Append variable string value to the variables string
            $varsString .= (string) $variable;
        }
        $varsString .= ')';

        return $varsString;
    }

    /**
     * @return string
     */
    protected function constructArguments(): string
    {
        // Return empty string if list is empty
        if (empty($this->arguments)) {
            return '';
        }

        // Construct arguments string if list not empty
        $constraintsString = '(';
        $first             = true;
        foreach ($this->arguments as $name => $value) {

            // Append space at the beginning if it's not the first item on the list
            if ($first) {
                $first = false;
            } else {
                $constraintsString .= ' ';
            }

            // Convert argument values to graphql string literal equivalent
            if (is_scalar($value) || $value === null) {
                // Convert scalar value to its literal in graphql
                $value = StringLiteralFormatter::formatValueForRHS($value);
            } elseif (is_array($value)) {
                // Convert PHP array to its array representation in graphql arguments
                $value = StringLiteralFormatter::formatArrayForGQLQuery($value);
            }
            // TODO: Handle cases where a non-string-convertible object is added to the arguments
            $constraintsString .= $name . ': ' . $value;
        }
        $constraintsString .= ')';

        return $constraintsString;
    }

    /**
     * @return string
     */
    public function __toString()
    {
        $queryFormat = static::QUERY_FORMAT;
        $selectionSetString = $this->constructSelectionSet();

        if (!$this->isNested) {
            $queryFormat = $this->generateSignature();
            if ($this->fieldName === '') {

                return $queryFormat . $selectionSetString;
            } else {
                $queryFormat = $this->generateSignature() . " {" . PHP_EOL . static::QUERY_FORMAT . PHP_EOL . "}";
            }
        }
        $argumentsString = $this->constructArguments();

        return sprintf($queryFormat, $this->generateFieldName(), $argumentsString, $selectionSetString);
    }

    /**
     * @return string
     */
    protected function generateFieldName(): string
    {
        return empty($this->alias) ? $this->fieldName : sprintf('%s: %s', $this->alias, $this->fieldName);
    }

    /**
     * @return string
     */
    protected function generateSignature(): string
    {
        $signatureFormat = '%s%s%s';

        return sprintf($signatureFormat, static::OPERATION_TYPE, $this->operationName, $this->constructVariables());
    }

    /**
     *
     */
    protected function setAsNested()
    {
        $this->isNested = true;
    }
}
