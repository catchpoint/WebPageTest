<?php

require_once __DIR__ . '/../../vendor/autoload.php';

use Illuminate\Container\Container;
use Illuminate\Contracts\Foundation\Application;
use Illuminate\Events\Dispatcher;
use Illuminate\Filesystem\Filesystem;
use Illuminate\Support\Facades\Blade;
use Illuminate\Support\Facades\Facade;
use Illuminate\Support\Facades\View;
use Illuminate\View\Compilers\BladeCompiler;
use Illuminate\View\Engines\CompilerEngine;
use Illuminate\View\Engines\EngineResolver;
use Illuminate\View\Engines\PhpEngine;
use Illuminate\View\Factory;
use Illuminate\View\FileViewFinder;

// inspiration: https://github.com/mattstauffer/Torch/blob/master/components/view/index.php

class App extends Container
{
    public function getNamespace(): string
    {
        return 'WebPageTest\\';
    }
}

// Configuration
$pathsToTemplates = [__DIR__ . '/views'];
$pathToCompiledTemplates = __DIR__ . '/compiled';

// Dependencies
$container = App::getInstance();
$container->instance(Application::class, $container);

$filesystem = new Filesystem();
$eventDispatcher = new Dispatcher($container);

// Create View Factory capable of rendering PHP and Blade templates
$viewResolver = new EngineResolver();
$bladeCompiler = new BladeCompiler($filesystem, $pathToCompiledTemplates);

$viewResolver->register('blade', function () use ($bladeCompiler) {
    return new CompilerEngine($bladeCompiler);
});

$viewResolver->register('php', function () use ($filesystem) {
    return new PhpEngine($filesystem);
});

$viewFinder = new FileViewFinder($filesystem, $pathsToTemplates);
$viewFactory = new Factory($viewResolver, $viewFinder, $eventDispatcher);
$viewFactory->setContainer($container);
Facade::setFacadeApplication($container);
$container->instance(\Illuminate\Contracts\View\Factory::class, $viewFactory);
$container->alias(
    \Illuminate\Contracts\View\Factory::class,
    (new class extends View {
        public static function getFacadeAccessor()
        {
            return parent::getFacadeAccessor();
        }
    })::getFacadeAccessor()
);
$container->instance(BladeCompiler::class, $bladeCompiler);
$container->alias(
    BladeCompiler::class,
    (new class extends Blade {
        public static function getFacadeAccessor()
        {
            return parent::getFacadeAccessor();
        }
    })::getFacadeAccessor()
);

function view($tmpl, $vars)
{
    global $viewFactory;
    return $viewFactory->make($tmpl, $vars)->render();
}
