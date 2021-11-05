<?php declare(strict_types=1);

class Template {
  private string $dir;

  function __construct (?string $folder = null) {
    $dir = __DIR__ . '/../templates';
    $normalized = "";
    if ($folder) {
      $normalized = rtrim($folder);
    }
    $this->dir = realpath("{$dir}/{$normalized}");
  }

  public function get_dir () : string {
    return $this->dir;
  }

  public function render (string $template_name, array $variables = array()) : string {
    $template = "{$this->dir}/{$template_name}.php";

    if (!file_exists($template)) {
      throw new Exception("Template {$template} not found");
    }

    ob_start();
    foreach ($variables as $key => $value) {
      ${$key} = $value;
    }
    include $template;
    return ob_get_clean();
  }
}
