<?php


$exps = array(
    (object) [
    'id' => '',
    'value' => 'deferjs',
    'label' => 'Defer Blocking Scripts',
    'required' => false,
    'hint' => 'site.js'
    ],
    (object) [
    'value' => 'asyncjs',
    'label' => 'Async Blocking Scripts',
    'required' => false,
    'hint' => 'site.js'
    ],
    (object) [
    'value' => 'asynccss',
    'label' => 'Load Stylesheets Async',
    'required' => false,
    'hint' => 'site.css'
    ],
    (object) [
    'value' => 'imageaspectratio',
    'label' => 'Add image aspect ratios',
    'required' => true,
    'hint' => 'foo.jpg|w500|h600'
    ],
    (object) [
    'value' => 'inline',
    'label' => 'Inline external JS or CSS',
    'required' => true,
    'hint' => 'site.css'
    ],
    (object) [
    'value' => 'addpreload',
    'label' => 'Preload files',
    'required' => true,
    'hint' => 'path/to/foo.jpg'
    ],
    (object) [
    'value' => 'removepreload',
    'label' => 'Remove preloads for files',
    'required' => true,
    'hint' => 'site.js'
    ],
    (object) [
    'value' => 'addpreconnect',
    'label' => 'Preconnect domains',
    'required' => true,
    'hint' => 'https://www.webpagetest.org'
    ],
    (object) [
    'value' => 'addloadinglazy',
    'label' => 'Add loading=lazy to images',
    'required' => true,
    'hint' => 'myimage.jpg'
    ],
    (object) [
    'value' => 'removeloadinglazy',
    'label' => 'Remove loading=lazy from images',
    'required' => true,
    'hint' => 'myimage.jpg'
    ],
    (object) [
    'value' => 'minifycss',
    'label' => 'Minify all CSS',
    'required' => false,
    'instruction' => false,
    'hint' => 'no value necessary'
    ],
    (object) [
    'value' => 'addpriorityhint',
    'label' => 'add fetchpriority=high or low to an image script or link by url',
    'required' => true,
    'hint' => 'foo.jpg|i_high'
    ],
    (object) [
    'value' => 'removepriorityhint',
    'label' => 'remove fetchpriority attribute on an image script or link by url',
    'required' => true,
    'hint' => 'foo.jpg'
    ],
    (object) [
        'value' => 'swap',
        'label' => 'find and replace arbitrary text',
        'required' => true,
        'fields' => array(
            (object) [
                'label' => 'find',
                'name' => 'pattern',
                'type' => 'text'
            ],
            (object) [
                'label' => 'replace',
                'name' => 'replacement',
                'type' => 'text'
            ],
            (object) [
                'label' => 'Use Regular Expressions?',
                'name' => 'useRegExp',
                'type' => 'checkbox'
            ],
            (object) [
                'label' => 'RegExp Flags (default: gi)',
                'name' => 'flags',
                'type' => 'text'
            ]
        )
        ]
        
);


foreach( $exps as $recipe ) {
    echo <<<EOT
    <div style="border-top: 1px solid rgba(255,255,255,.1); padding: 2em 0; align-items: center; display: flex; gap: 2rem;">
        <label style="display:block; text-align: right; flex: 0 1 20em">
            <input type="checkbox" name="recipes[]" value="{$recipe->value}"> <strong>{$recipe->value}:</strong> {$recipe->label}
        </label>
    EOT;

        if( $recipe->fields ){
            echo '<fieldset style="flex: 0 1 35%; text-align: right;">';
            foreach($recipe->fields as $field){
                echo <<<EOT
                    <label style="display: block; text-align: right; width: 100%; margin: 0.5em 0 0.3em 0;">{$field->label}: <input style="margin-left: .5em;" type="{$field->type}" name="{$recipe->value}[]" value="" placeholder="{$field->hint}"></label>
                EOT;
            }
            echo '</fieldset>';
        }else{
            echo <<<EOT
            <fieldset style="flex: 0 1 35%; text-align: right;">
                <label style="display: block; width: 100%; margin: 0.5em 0 0.3em 0;" class="experiment_custom_instruction">Asset/Instruction: <input style="margin-left: .5em;" type="text" name="{$recipe->value}[]" value="" placeholder="{$recipe->hint}"></label>
            </fieldset>
            EOT;
        }
   echo "</div>";
   
} 

?>