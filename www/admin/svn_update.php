<?php
// No time limit since the update can take long time.
set_time_limit(0);
// cd to the svn root.
chdir('..');

RunCommand("svn update");
RunCommand("svn cleanup");

/**
 * Take a shell command, execute it and output it as html response if the
 * the command is successful.
 */
function RunCommand($command)
{
  // To capture the output in array.
  $output;
  // To capture the return value of the operation.
  $return_val;
  // Execute given command.
  exec($command, $output, $return_val);
  if ($return_val == 0)
  {
    // Dump the command output to the user.
    echo "<pre>";
    foreach ($output as $output_line)
    {
      echo $output_line . '<br>';
    }
    echo "</pre>";
  }
}
?>
