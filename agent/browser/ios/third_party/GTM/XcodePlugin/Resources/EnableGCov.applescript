(*
	EnableGCov.applescript
	
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
	
	Enables and disables gcov by either setting or removing the 
	GCC_INSTRUMENT_PROGRAM_FLOW_ARCS & GCC_GENERATE_TEST_COVERAGE_FILES 
	settings as appropriate, and adding a link to the gcov library
	if necessary.
*)

(* 
	gets passed a list of args from Xcode
	first arg is whether to enable or disable gcov settings,
*)
on run (enable)
	tell application "Xcode"
		tell project of active project document
			set buildconfig to name of active build configuration type
			tell build configuration buildconfig of active target
				set needsGcovLib to true
				try
					set machOType to value of flattened build setting "MACH_O_TYPE"
					if (machOType is "staticlib") or (machOType is "mh_object") then
						set needsGcovLib to false
					end if
				end try
				
				if item 1 of enable is "YES" then
					set value of build setting "GCC_INSTRUMENT_PROGRAM_FLOW_ARCS" to "YES"
					set value of build setting "GCC_GENERATE_TEST_COVERAGE_FILES" to "YES"
					if needsGcovLib then
						try
							set a to value of build setting "OTHER_LDFLAGS"
						on error
							set a to "$(inherited)"
						end try
						if a does not contain "-lgcov" then
							set value of build setting "OTHER_LDFLAGS" to a & " -lgcov"
						end if
					end if
				else
					try
						delete build setting "GCC_INSTRUMENT_PROGRAM_FLOW_ARCS"
					end try
					try
						delete build setting "GCC_GENERATE_TEST_COVERAGE_FILES"
					end try
					if needsGcovLib then
						try
							set a to value of build setting "OTHER_LDFLAGS"
							set oldDelims to AppleScript's text item delimiters
							set AppleScript's text item delimiters to " "
							set a to every text item of a
							set c to {}
							repeat with b in a
								if b as string is not equal to "-lgcov" then
									set c to c & b
								end if
							end repeat
							set a to c as string
							set AppleScript's text item delimiters to oldDelims
							if (length of a > 0) and (a ­ "$(inherited)") then
								set value of build setting "OTHER_LDFLAGS" to a
							else
								delete build setting "OTHER_LDFLAGS"
							end if
						end try
					end if
				end if
			end tell
		end tell
	end tell
end run
