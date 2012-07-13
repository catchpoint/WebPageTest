(*
	ResetGCov.applescript
	
    Copyright 2007-2009 Google Inc.
  
    Licensed under the Apache License, Version 2.0 (the "License"); you may not
    use this file except in compliance with the License.  You may obtain a copy
    of the License at
   
    http://www.apache.org/licenses/LICENSE-2.0
   
    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
    WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.  See the
    License for the specific language governing permissions and limitations under
    the License.
	
	Support script for using gcov with Xcode
*)

(* 
	gets passed a list of args from Xcode
	only arg is the dir to clean under
*)
on run args
	-- get our dir to clean
	set cleanDir to item 1 of args
	
	-- get rid of all our gcov data files
	set shellScript to "find " & quoted form of (cleanDir) & " -name \"*.gcda\" -print0 | /usr/bin/xargs -0 /bin/rm -f"
	do shell script shellScript
end run
