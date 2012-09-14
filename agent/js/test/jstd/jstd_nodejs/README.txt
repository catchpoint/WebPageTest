This subdirectory contains Node.js modules -- some copied and some faked-out,
to make JsTestDriver tests work in a browser, only just enough for this
particular project's tests. It should presumably all go away when
JsTestDriver hopefully learns to run test code on actual Node.js.
This is only tested on Chrome (16), no need to test other browsers, since it is
not browser-targeted code to begin with, and hopefully it is all temporary.

The most important major difference between Node and a browser is namespaces
and scopes. In Node all modules have their own private namespace,
and a module-private variable "exports", which gets returned when some other
module calls require() for that module, and the other module has its own
separate "exports". In a browser everything goes into the same global
namespace. So when we read a Node module into a browser, and the module
assigns some properties on "exports", and then we read another Node module,
they are all dumping into the same global "exports" object, with potential
naming conflicts and silent overwrites. This is why the fake require() in
builtins.js returns "exports" if it doesn't find an explicitly registered
fake module object for the requested module name. Like I said, temporary, yeah.
