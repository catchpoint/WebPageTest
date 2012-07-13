(*
	opencoverage.applescript
	
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
	first arg is the path to open
*)
on run args
	
	-- check args
	set filename to POSIX path of item 1 of args
	
	-- check if it exists first
	set doesExist to false
	tell application "System Events"
		set doesExist to item filename exists
	end tell
	if doesExist then
		-- open it in coverstory
		do shell script "/usr/bin/open -a CoverStory " & quoted form of filename
	else
		-- report the error
		tell application "Xcode"
			display alert "The path we needed didn't exist." & return & quoted form of (filename)
		end tell
	end if
	
end run
