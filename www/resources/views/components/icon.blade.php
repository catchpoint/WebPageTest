@switch($type)
    @case('check')
        <img src="/assets/images/src/icon_grading_check.svg" width="20" height="20" alt="Icon: {{$type}}" title="{{ ucfirst($type) }}">
        @break
    @case('warning')
        <img src="/assets/images/src/icon_grading_warn.svg" width="20" height="20" alt="Icon: {{$type}}" title="{{ ucfirst($type) }}">
        @break
    @case('error')
        <img src="/assets/images/src/icon_grading_alert.svg" width="20" height="20" alt="Icon: {{$type}}" title="{{ ucfirst($type) }}">
        @break
@endswitch
