# Avoiding false-positives

When you run Psalm's taint analysis for the first time you may see a bunch of false-positives.

Nobody likes false-positives!

There are a number of ways you can prevent them:

## Escaping tainted input

Some operations remove taints from data – for example, wrapping `$_GET['name']` in an `htmlentities` call prevents cross-site-scripting attacks in that `$_GET` call.

Psalm allows you to remove taints via a `@psalm-taint-escape <taint-type>` annotation:

```php
<?php

function echoVar(string $str) : void {
    /**
     * @psalm-taint-escape html
     */
    $str = str_replace(['<', '>'], '', $str);
    echo $str;
}

echoVar($_GET["text"]);
```

## Conditionally escaping tainted input

A slightly modified version of the previous example is using a condition to determine whether the return value
is considered secure. Only in case function argument `$escape` is true, the corresponding annotation
`@psalm-taint-escape` is applied for taint type `html` .

```php
<?php
/**
 * @param string $str
 * @param bool $escape
 * @psalm-taint-escape ($escape is true ? 'html' : null)
 */
function processVar(string $str, bool $escape = true) : string {
    if ($escape) {
      $str = str_replace(['<', '>'], '', $str);
    }
    return $str;
}

echo processVar($_GET['text'], false); // detects tainted HTML
echo processVar($_GET['text'], true); // considered secure
```

## Sanitizing HTML user input

Whenever possible, applications should be designed to accept & store user input as discrete text fields, rather than blocks of HTML.  This allows user input to be fully escaped via `htmlspecialchars` or `htmlentities`.  In cases where HTML user input is required (e.g. rich text editors like [TinyMCE](https://www.tiny.cloud/)), a library designed specifically to filter out risky HTML is highly recommended.  For example, [HTML Purifier](http://htmlpurifier.org/docs) could be used as follows:

```php
<?php

/**
 * @psalm-taint-escape html
 * @psalm-taint-escape has_quotes
 */
function sanitizeHTML($html){
    $purifier = new HTMLPurifier();
    return $purifier->purify($html);
}
```

## Specializing taints in functions

For functions, methods and classes you can use the `@psalm-taint-specialize` annotation.

```php
<?php

function takesInput(string $s) : string {
    return $s;
}

echo htmlentities(takesInput($_GET["name"]));
echo takesInput("hello"); // Psalm detects tainted HTML here
```

Adding a `@psalm-taint-specialize` annotation solves the problem, by telling Psalm that each invocation of the function should be treated separately.

```php
<?php

/**
 * @psalm-taint-specialize
 */
function takesInput(string $s) : string {
    return $s;
}

echo htmlentities(takesInput($_GET["name"]));
echo takesInput("hello"); // No error
```

A specialized function or method will still track tainted input:

```php
<?php

/**
 * @psalm-taint-specialize
 */
function takesInput(string $s) : string {
    return $s;
}

echo takesInput($_GET["name"]); // Psalm detects tainted input
echo takesInput("hello"); // No error
```

Here we’re telling Psalm that a function’s taintedness is wholly dependent on the input to the function.

If you're familiar with [immutability in Psalm](https://psalm.dev/articles/immutability-and-beyond) then this general idea should be familiar, since a pure function is one where the output is wholly dependent on its input. Unsurprisingly, all functions marked `@psalm-pure` _also_ specialize the taintedness of their output based on input:

```php
<?php

/**
 * @psalm-pure
 */
function takesInput(string $s) : string {
    return $s;
}

echo htmlentities(takesInput($_GET["name"]));
echo takesInput("hello"); // No error
```

## Specializing taints in classes

Just as taints can be specialized in function calls, tainted properties can also be specialized to a given class.

```php
<?php

class User {
    public string $name;

    public function __construct(string $name) {
        $this->name = $name;
    }
}

/**
 * @psalm-taint-specialize
 */
function echoUserName(User $user) {
    echo $user->name; // Error, detected tainted input
}

$user1 = new User("Keith");
$user2 = new User($_GET["name"]);

echoUserName($user1);
```

Adding `@psalm-taint-specialize` to the class fixes the issue.

```php
<?php

/**
 * @psalm-taint-specialize
 */
class User {
    public string $name;

    public function __construct(string $name) {
        $this->name = $name;
    }
}

/**
 * @psalm-taint-specialize
 */
function echoUserName(User $user) {
    echo $user->name; // No error
}

$user1 = new User("Keith");
$user2 = new User($_GET["name"]);

echoUserName($user1);
```

And, because it’s form of purity enforcement, `@psalm-immutable` can also be used:

```php
<?php

/**
 * @psalm-immutable
 */
class User {
    public string $name;

    public function __construct(string $name) {
        $this->name = $name;
    }
}

/**
 * @psalm-taint-specialize
 */
function echoUserName(User $user) {
    echo $user->name; // No error
}

$user1 = new User("Keith");
$user2 = new User($_GET["name"]);

echoUserName($user1);
```

## Avoiding files in taint paths

You can also tell Psalm that you’re not interested in any taint paths that flow through certain files or directories by specifying them in your Psalm config:

```xml
    <taintAnalysis>
        <ignoreFiles>
            <directory name="tests"/>
        </ignoreFiles>
    </taintAnalysis>
```
