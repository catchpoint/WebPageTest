--
--  Copyright 2008 Google Inc.
--
--  Licensed under the Apache License, Version 2.0 (the "License"); you may not
--  use this file except in compliance with the License.  You may obtain a copy
--  of the License at
-- 
--  http://www.apache.org/licenses/LICENSE-2.0
-- 
--  Unless required by applicable law or agreed to in writing, software
--  distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
--  WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.  See the
--  License for the specific language governing permissions and limitations under
--  the License.
--

script parentTestScript
	property parentTestScriptProperty : 6
	on parentTestScriptFunc()
		return "parent"
	end parentTestScriptFunc
end script

script testScript
	property parent : parentTestScript
	property testScriptProperty : 5
	on testScriptFunc()
		return "child"
	end testScriptFunc
	on open foo
	end open
end script

property foo : 1

on test()
end test

on testReturnOne()
	return 1
end testReturnOne

on testReturnParam(param)
	return param
end testReturnParam

on testAddParams(param1, param2)
	return param1 + param2
end testAddParams

on testAdd of a onto b given otherValue:d
	return a + b + d
end testAdd

on testGetScript()
	return testScript
end testGetScript

on print
end print
