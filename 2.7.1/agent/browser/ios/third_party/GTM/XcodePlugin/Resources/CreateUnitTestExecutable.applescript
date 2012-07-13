(*
  CreateUnitTestExecutable.scpt
	
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
	
	Support script for easily creating debug executables for unittests
	 	
	2008/03/06 Added support for debug frameworks, Xcode 3.1, and debugging under a testhost
*)

on replaceText(theString, fString, rString)
	set current_Delimiters to AppleScript's text item delimiters
	set AppleScript's text item delimiters to fString
	set sList to every text item of theString
	set AppleScript's text item delimiters to rString
	set newString to sList as string
	set AppleScript's text item delimiters to current_Delimiters
	return newString
end replaceText

on findVariable(a)
	set b to "echo '" & a & "' | grep -o \"$\\([^)]*)\\)\" | head -n 1"
	return do shell script b
end findVariable

on expandBuildSettings(a, b)
	tell me
		repeat
			set pattern to findVariable(a)
			if (length of pattern is equal to 0) then
				exit repeat
			else
				set oldValue to word 2 of pattern
				tell application "Xcode"
					-- get our project
					tell project of active project document
						set activeBuildConfig to name of active build configuration type
						try
							if oldValue is "inherited" then
								set oldValue to word 2 of b
								tell build configuration activeBuildConfig
									set newValue to value of flattened build setting oldValue
								end tell
							else
								tell build configuration activeBuildConfig of active target
									set newValue to value of flattened build setting oldValue
								end tell
							end if
						on error
							log "Unable to expand '" & oldValue & "'"
							set newValue to ""
						end try
					end tell
				end tell
				set newValue to expandBuildSettings(newValue, a)
				set a to replaceText(a, pattern, newValue)
			end if
		end repeat
	end tell
	return a
end expandBuildSettings

on expandBuildSetting(a)
	return expandBuildSettings(a, "")
end expandBuildSetting

tell application "Xcode"
	-- get our project
	tell project of active project document
		set activeBuildConfig to name of active build configuration type
		
		-- build executable
		tell build configuration activeBuildConfig of active target
			tell me
				set productName to expandBuildSetting("$(PRODUCT_NAME)")
				set productPath to expandBuildSetting("$(SRCROOT)/$(BUILT_PRODUCTS_DIR)")
			end tell
			tell me
				set wrapperExtension to expandBuildSetting("$(WRAPPER_EXTENSION)")
			end tell
			try
				tell me
					set useGC to expandBuildSetting("$(GCC_ENABLE_OBJC_GC)")
					if useGC is equal to "Unsupported" or useGC is equal to "" then
						set useGC to yes
					else
						set useGC to no
					end if
				end tell
			on error e
				log "Unable to expand GCC_ENABLE_OBJC_GC " & e
				set useGC to no
			end try
			try
				tell me
					set testhost to expandBuildSetting("$(TEST_HOST)")
					-- if testhost is a relative path, make it absolute
					if first character of testhost is not "/" then
						set testhost to expandBuildSetting("$(SRCROOT)") & "/" & testhost
					end if
				end tell
			on error e
				log "Unable to expand testHost " & e
				set testhost to ""
			end try
		end tell
		
		if wrapperExtension is equal to "octest" then
			set executablePath to "/Developer/Tools/otest"
			set executableName to "otest"
		else if wrapperExtension is equal to "gtest" then
			set executablePath to "/Developer/Tools/gUnit"
			set executableName to "gUnit"
		else
			display alert "Unknown test type with extension " & wrapperExtension
			return
		end if
		
		if testhost is not equal to "" then
			set executablePath to testhost
			set executableName to "TestHost"
		end if
		
		set execName to productName & "(" & executableName & ")"
		set exec to make new executable with properties ¬
			{name:execName, launchable:yes, path:executablePath, comments:¬
				"Test executable for " & name of active target & "(" & executableName & ")." & ¬
				return & "Generated " & (current date) & " by Google Toolbox For Mac Xcode Plugin." & ¬
				return & "Go to http://developer.apple.com/technotes/tn2004/tn2124.html for more info on settings."}
		tell exec
			if useGC is equal to "Unsupported" or useGC is equal to "" then
			end if
			
			if wrapperExtension is "octest" then
				-- force some nice cocoa debug stuff on
				make new launch argument with properties {name:"-NSBindingDebugLogLevel 1", active:yes}
				make new launch argument with properties {name:"-NSScriptingDebugLogLevel 1", active:yes}
				make new launch argument with properties {name:"-NSTraceEvents YES", active:no}
				make new launch argument with properties {name:"-NSShowAllViews YES", active:no}
				make new launch argument with properties {name:"-NSShowAllDrawing YES", active:no}
				make new launch argument with properties {name:"-NSDragManagerLogLevel 6", active:no}
				make new launch argument with properties {name:"-NSAccessibilityDebugLogLevel 3", active:no}
			end if
			
			set bundlename to productName & "." & wrapperExtension
			set bundlePath to productPath & "/" & bundlename
			
			if testhost is not equal to "" then
				make new environment variable with properties {name:"XCInjectBundleInto", value:testhost, active:yes}
				make new environment variable with properties {name:"DYLD_INSERT_LIBRARIES", value:"/Developer/Library/PrivateFrameworks/DevToolsBundleInjection.framework/DevToolsBundleInjection", active:yes}
				make new environment variable with properties {name:"XCInjectBundle", value:bundlePath, active:yes}
				if wrapperExtension is "octest" then
					make new launch argument with properties {name:"-SenTest All", active:yes}
				end if
			else
				if wrapperExtension is "octest" then
					make new launch argument with properties {name:"-SenTest Self", active:yes}
				end if
				make new launch argument with properties {name:"\"" & bundlePath & "\"", active:yes}
			end if
			
			make new environment variable with properties {name:"OBJC_DISABLE_GC", value:"YES", active:useGC}
			
			make new environment variable with properties {name:"DYLD_LIBRARY_PATH", value:".", active:yes}
			make new environment variable with properties {name:"DYLD_FRAMEWORK_PATH", value:".:/Developer/Library/Frameworks", active:yes}
			make new environment variable with properties {name:"DYLD_NEW_LOCAL_SHARED_REGIONS", value:"YES", active:yes}
			make new environment variable with properties {name:"DYLD_NO_FIX_PREBINDING", value:"YES", active:yes}
			make new environment variable with properties {name:"MallocScribble", value:"YES", active:yes}
			make new environment variable with properties {name:"MallocPreScribble", value:"YES", active:yes}
			make new environment variable with properties {name:"MallocGuardEdges", value:"YES", active:yes}
			make new environment variable with properties {name:"NSAutoreleaseFreedObjectCheckEnabled", value:"YES", active:yes}
			make new environment variable with properties {name:"NSZombieEnabled", value:"YES", active:yes}
			make new environment variable with properties {name:"OBJC_DEBUG_FRAGILE_SUPERCLASSES", value:"YES", active:yes}
			
			make new environment variable with properties {name:"ComponentDebug", value:"1", active:no}
			make new environment variable with properties {name:"FilesASDDebug", value:"1", active:no}
			make new environment variable with properties {name:"VNDebug", value:"1", active:no}
			make new environment variable with properties {name:"WSDebug", value:"1", active:no}
			make new environment variable with properties {name:"WSDebugVerbose", value:"1", active:no}
			make new environment variable with properties {name:"DRVerboseLogging", value:"1", active:no}
			make new environment variable with properties {name:"INIT_Processes", value:"1", active:no}
			make new environment variable with properties {name:"EventDebug", value:"1", active:no}
			make new environment variable with properties {name:"EventRate", value:"1", active:no}
			make new environment variable with properties {name:"TSMEventTracing", value:"1", active:no}
			make new environment variable with properties {name:"OBJC_PRINT_IMAGES", value:"1", active:no}
			make new environment variable with properties {name:"OBJC_PRINT_LOAD_METHODS", value:"1", active:no}
			make new environment variable with properties {name:"DYLD_IMAGE_SUFFIX", value:"_debug", active:no}
			make new environment variable with properties {name:"DYLD_PRINT_LIBRARIES", value:"1", active:no}
			make new environment variable with properties {name:"DYLD_PRINT_LIBRARIES_POST_LAUNCH", value:"1", active:no}
			make new environment variable with properties {name:"DYLD_PREBIND_DEBUG", value:"1", active:no}
			make new environment variable with properties {name:"DYLD_PRINT_APIS", value:"1", active:no}
			make new environment variable with properties {name:"DYLD_PRINT_BINDINGS", value:"1", active:no}
			make new environment variable with properties {name:"DYLD_PRINT_INITIALIZERS", value:"1", active:no}
			make new environment variable with properties {name:"DYLD_PRINT_SEGMENTS", value:"1", active:no}
			make new environment variable with properties {name:"DYLD_PRINT_STATISTICS", value:"1", active:no}
			make new environment variable with properties {name:"NSDeallocateZombies", value:"YES", active:no}
			make new environment variable with properties {name:"NSHangOnUncaughtException", value:"YES", active:no}
			make new environment variable with properties {name:"NSEnableAutoreleasePool", value:"NO", active:no}
			make new environment variable with properties {name:"NSAutoreleaseHighWaterMark", value:"1000", active:no}
			make new environment variable with properties {name:"NSAutoreleaseHighWaterResolution", value:"100", active:no}
			make new environment variable with properties {name:"NSPrintDynamicClassLoads", value:"YES", active:no}
			make new environment variable with properties {name:"NSExceptionLoggingEnabled", value:"YES", active:no}
			make new environment variable with properties {name:"NSDOLoggingEnabled", value:"YES", active:no}
			make new environment variable with properties {name:"NSQuitAfterLaunch", value:"YES", active:no}
			make new environment variable with properties {name:"CFZombieLevel", value:"3", active:no}
			make new environment variable with properties {name:"AEDebugSends", value:"1", active:no}
			make new environment variable with properties {name:"AEDebugReceives", value:"1", active:no}
		end tell
		set active executable to exec
	end tell
end tell

