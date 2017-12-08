PHPStats Statistical Library
============================

**Deprecation Notice**

This library was written at a time before Composer had really started to take off. As such, it is monolithic. It was also written at a time when I was a worse programmer, so it has some jankiness too. :) I am currently in the process of rewriting a more modern and maintainable set of PHP code to replace this. If you're interested in helping, please message me with details about what your interests and relative skills are. Until the replacement is ready, this code will remain on GitHub, but will also be effectively unmaintained. Apologies for the inconvenience.

So far, this library has been broken into these components:
- [LinearAlgebra](https://github.com/mcordingley/LinearAlgebra)
- [Scientific](https://github.com/mcordingley/Scientific)

**Introduction to PHPStats**
PHPStats is a statistical library for PHP.  Its goal is to implement
statistical functions in PHP that are not covered in the PHP core.
PHPStats is written entirely in native PHP for ease of installation
and for use in shared hosting environments, where the installation
of binary files is difficult, if not impossible.

**Downloading PHPStats**
To download PHPStats visit
<a href="https://github.com/mcordingley/PHPStats">the GitHub page</a>
for the latest code or download the
<a href="https://github.com/mcordingley/PHPStats/zipball/v0.4">current stable version</a>.

**Installation**
Installing PHPStats is easy.  Just copy the PHPStats.phar file into the
folder where you keep your libraries and include the file in your scripts.
At this point, you can just start using the classes directly; the classes
will autoload when needed.  As an example:
include('PHPStats.phar');

To use a class, remember to properly call the namespace that it's in.  For
example, to create a new instance of the Beta distribution, call it like this:
$beta = new \PHPStats\ProbabilityDistribution\Beta(6,20);

If performance is a concern, files can be pre-emptively loaded, rather than
waiting for the autoload functionality.  For example, to pre-load the Beta class
file, call: include('phar://PHPStats.phar/lib/ProbabilityDistribution/Beta.php');

**Dependencies**
PHPStats is written to work with PHP 5.3 and greater, as it makes heavy use
of features introduced in PHP 5.3.  No other run-time dependencies exist.

Build dependencies include both Phing and PHPUnit.  When attempting to build
this library, beware that the tests for the random variate functions are
probabalistic in nature and will fail on occasion.

**License**
PHPStats is released under the LGPL version 3 or later.  For more details,
please refer to the copy of LICENSE.txt that accompanies your download.

**Change Log**

*v0.4*

Added Levy distribution

Added Kmeans clustering

Matrix constructor now optionally takes arrays

*v0.3*

Added LogNormal distribution

Tested and fixed all random number generators

Added Kolmogorov-Smirnov test

Completed implementing the gamma family of special functions

Many bugfixes

*v0.2*

Added a Matrix class for Linear Algebra

Added the Rayleigh Distribution

*v0.1.1*

Added the Cauchy Distribution

Assorted bug fixes

*v0.1* 

First release of PHPStats
