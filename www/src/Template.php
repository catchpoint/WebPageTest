<?php

declare(strict_types=1);

namespace WebPageTest;

class Template
{
    private string $dir;
    private string $layout;
    private string $layout_dir;

    public function __construct(?string $folder = null)
    {
        $dir = __DIR__ . '/../templates';
        $this->dir = realpath("{$dir}/{$folder}");
        $this->layout_dir = realpath(__DIR__ . '/../templates/layouts');
        $this->layout = realpath("{$this->layout_dir}/default.php");
    }

    public function getDir(): string
    {
        return $this->dir;
    }

    public function getLayout(): string
    {
        return realpath($this->layout);
    }

    public function setLayout(string $layout_name): void
    {
        $layout = "{$this->layout_dir}/{$layout_name}.php";
        if (!file_exists($layout)) {
            throw new \Exception("Layout {$layout} not found");
        }
        $this->layout = $layout;
    }

    public function render(string $template_name, array $variables = array()): string
    {
        $template = "{$this->dir}/{$template_name}.php";

        if (!file_exists($template)) {
            throw new \Exception("Template {$template} not found");
        }

        ob_start();
        foreach ($variables as $key => $value) {
            ${$key} = $value;
        }
        include $template;
        $template_output = ob_get_clean();

        ob_start();
        include $this->layout;
        return ob_get_clean();
    }
}
