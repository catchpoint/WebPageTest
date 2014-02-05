def _CheckChange(input_api, output_api):
  results = []
  results += input_api.canned_checks.CheckDoNotSubmit(input_api, output_api)
  results += input_api.canned_checks.CheckChangeHasNoTabs(input_api, output_api)
  results += input_api.canned_checks.CheckLongLines(input_api, output_api, 80)
  lint_results = _Lint(input_api, output_api)
  results += lint_results
  if lint_results:
    print 'Not running unit tests, please fix lint errors first.'
  else:
    results += _UnitTests(input_api, output_api)
  return results


def _GetWptTestCommand(input_api, output_api):
  agent_dir = input_api.PresubmitLocalPath()
  if input_api.platform == 'win32':
    return ('cmd', '/c', input_api.os_path.join(agent_dir, 'wpttest.bat'))
  else:
    return (input_api.os_path.join(agent_dir, 'wpttest.sh'),)


def _RunWptTest(input_api, output_api, name, *flags):
  wpttest_command = _GetWptTestCommand(input_api, output_api) + flags
  command = input_api.Command(
    name=name,
    cmd=wpttest_command,
    kwargs={},
    message=output_api.PresubmitPromptWarning)
  print 'Running %s: %s' % (name, wpttest_command)
  return input_api.RunTests([command])


def _Lint(input_api, output_api):
  if input_api.platform == 'win32':
    # Windows lint not yet implemented.
    print 'WARNING: lint checks not yet implemented on Windows'
    return []
  return _RunWptTest(input_api, output_api, 'lint', '--lint')


def _UnitTests(input_api, output_api):
  if input_api.platform == 'win32':
    # Windows lint not yet implemented.
    print 'WARNING: lint checks not yet implemented on Windows'
    return []
  return _RunWptTest(input_api, output_api, 'unit tests')


def CheckChangeOnUpload(input_api, output_api):
  return _CheckChange(input_api, output_api)


def CheckChangeOnCommit(input_api, output_api):
  return _CheckChange(input_api, output_api)
