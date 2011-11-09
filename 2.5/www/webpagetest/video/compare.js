function ValidateInput(form)
{
    var ret = false;
    
    var count = $('input:checked[name="t[]"]').size();
    if( count > 0 )
    {
        if( count <= maxCompare )
            ret = true;
        else
        {
            alert("Select no more than " + maxCompare + " tests to compare");
            return false;
        }
    }
    else
        alert("Please select at least one test to create a video from");
    
    return ret;
}

function ShowAdvanced()
{
    $("#advanced").modal({opacity:80});
}