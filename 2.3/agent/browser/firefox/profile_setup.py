#!/usr/bin/python
# Copyright (c) 2011, Google Inc.
# All rights reserved.
#
# Redistribution and use in source and binary forms, with or without
# modification, are permitted provided that the following conditions are met:
#
#   * Redistributions of source code must retain the above copyright notice,
#     this list of conditions and the following disclaimer.
#   * Redistributions in binary form must reproduce the above copyright
#     notice, this list of conditions and the following disclaimer in the
#     documentation and/or other materials provided with the distribution.
#   * Neither the name of the <ORGANIZATION> nor the names of its contributors
#     may be used to endorse or promote products derived from this software
#     without specific prior written permission.
#
# THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
# AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
# IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
# DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
# FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
# DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
# SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
# CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
# OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
# OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.


"""Configures a Firefox profile.

To create a clean profile zip:
  1. Launch firefox with a new profile:
     $ firefox -profile PROFILE_DIR -no-remote
  2. Quit firefox.
  3. Zip it (for zsh):
     $ cd PROFILE_DIR
     $ zip profile.zip **/*

To use a profile zip:
  1. Run this program:
     $ ./profile_setup.py --profile_zip profile.zip --profile_dir PROFILE_DIR
  2. Run firefox:
     $ firefox -profile PROFILE_DIR

Additional profile_setup.py options:
  --extension_dir EXTENSION_DIR:  add an extension.
  --extension_debug: add preferences for debugging extensions.
"""

import logging
import optparse
import os
import re
import shutil
import zipfile


# Preferences to make a consistent web page testing environment.
PREFERENCES = {
    # Disable a dialog warning the user when javascript runs for too long.
    # See http://kb.mozillazine.org/Dom.max_script_run_time
    'dom.max_script_run_time': '0',
    'dom.max_chrome_script_run_time': '0',

    # Skip reloading previously opened tabs after a crash.
    'browser.sessionstore.resume_from_crash': 'false',

    # Skip checking for updated extensions on startup.
    'extensions.update.enabled': 'false',

    # Skip checking for updated extensions while browsing.
    'extensions.update.notifyUser': 'false',

    # Skip updating list of phishing sites.
    'browser.safebrowsing.remotelookups': 'false',

    # Never ask to check for updated versions of installed extensions.
    'extensions.checkCompatibility': 'false',

    # Never ask if firefox should be the default browser.
    'browser.shell.checkDefaultBrowser': 'false',

    # Never ask user for permission to enter a secure site from an insecure one.
    'security.warn_entering_secure': 'false',

    # Never ask user for permission to enter an insecure site from a secure one.
    'security.warn_entering_weak': 'false',

    # Never display a dialog warning the user when leaving a secure site.
    'security.warn_leaving_secure': 'false',

    # Never display a dialog warning the user when a page has both encrypted
    # and non-encrypted content.
    'security.warn_viewing_mixed': 'false',

    # Never warn when submitting information insecurely.  Loading some
    # pages trigers this.
    'security.warn_submit_insecure': 'false',

    # Enable net and script pannels in firebug:
    'extensions.firebug.net.enableSites': 'true',
    'extensions.firebug.script.enableSites': 'true',

    # Disable Java.
    'security.enable_java': 'false',

    # Disable using a proxy (default is system settings).
    'network.proxy.type': '0',
}

# Optional preferences used for debugging extensions.
# https://developer.mozilla.org/en/setting_up_extension_development_environment
DEBUG_PREFERENCES = {
    'javascript.options.showInConsole': 'true',
    'nglayout.debug.disable_xul_cache': 'true',
    'browser.dom.window.dump.enabled': 'true',
    'javascript.options.strict': 'true',
    'devtools.chrome.enabled': 'true',
    'extensions.logging.enabled': 'true',
    'nglayout.debug.disable_xul_fastload': 'true',
}


class FirefoxProfile(object):
  def __init__(self, profile_dir):
    """Initialize FirefoxProfile instance.

    Args:
      profile_dir: profile directory (e.g. ".mozilla/firefox/xxx.default")
    """
    self.profile_dir = profile_dir

  def UnzipProfile(self, profile_zip):
    """Unzip the |profile_zip| file to the profile directory.

    Args:
      profile_zip: the path name of the profile zip file.
    """
    if os.path.exists(self.profile_dir):
      shutil.rmtree(self.profile_dir)
    zipfile.ZipFile(profile_zip).extractall(self.profile_dir)

  def CopyExtension(self, extension_dir):
    """Copy extension files into the profile directory.

    Args:
      extension_dir: the directory that contains the extension file.
    """
    extension_id = self.GetExtensionId(extension_dir) or 'extension'
    target_dir = os.path.join(self.profile_dir, 'extensions', extension_id)
    if os.path.exists(target_dir):
      shutil.rmtree(target_dir)
    shutil.copytree(extension_dir, target_dir)

  def GetExtensionId(self, extension_dir):
    """Return the extension ID in |extension_dir|.

    This code does not do a full RDF parse -- it assumes the ID is in
    the first <em:id> tag.

    Args:
      extension_dir: the directory that contains install.rdf.
    Returns:
      a string representing the extension ID.
    """
    install_rdf = os.path.join(extension_dir, 'install.rdf')
    id_re = re.compile(r'<em:id>([^<]+)</em:id>')
    with open(install_rdf) as rdf:
      for line in rdf.readlines():
        match = id_re.search(line)
        if match:
          return match.group(1)
    logging.warn('Unable to find extension id: %s', install_rdf)
    return None

  def AddPreferences(self, preferences):
    """Add preferences for the given profile.

    Args:
      preferences: a dict of preferences (e.g. { pref_key: pref_value, ... })
    """
    prefs_file = os.path.join(self.profile_dir, 'prefs.js')
    try:
      with open(prefs_file, 'a') as fh:
        fh.write('\n// Preferences added by profile_setup.py:\n')
        for name, value in preferences.items():
          fh.write('user_pref("%s", %s);\n' % (name, value))
    except IOError, e:
      logging.error('Error adding preferences to file: %s.')
      raise

# TODO(slamm): windows console logging (remember to keep it x-platform)

def ParseOptions():
  class PlainHelpFormatter(optparse.IndentedHelpFormatter):
    def format_description(self, description):
      return description + '\n'
  option_parser = optparse.OptionParser(
      usage='%prog [options]',
      formatter=PlainHelpFormatter(),
      description=__doc__)
  option_parser.add_option('-p', '--profile_dir', default='',
      action='store',
      type='string',
      help='Profile directory firefox will use.')
  option_parser.add_option('-z', '--profile_zip', default='',
      action='store',
      type='string',
      help='File name for a zip of a clean profile.')
  option_parser.add_option('-e', '--extension_dir', default='',
      action='store',
      type='string',
      help='Directory of a firefox extension.')
  option_parser.add_option('-d', '--extension_debug', default=False,
      action='store_true',
      help='Add preferences for debugging extensions.')
  options, args = option_parser.parse_args()
  return options

def main(options):
  profile = FirefoxProfile(options.profile_dir)
  profile.UnzipProfile(options.profile_zip)
  if options.extension_dir:
    profile.CopyExtension(options.extension_dir)
  profile.AddPreferences(PREFERENCES)
  if options.extension_debug:
    profile.AddPreferences(DEBUG_PREFERENCES)

if __name__ == '__main__':
  main(ParseOptions())
