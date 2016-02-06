; A script for packaging botan with InnoSetup

[Setup]
AppName=Botan
AppVerName=Botan 1.11.26

AppPublisher=Jack Lloyd
AppPublisherURL=http://botan.randombit.net/
AppVersion=1.11.26

VersionInfoCopyright=Copyright (C) 1999-2012 Jack Lloyd and others
VersionInfoVersion=1.11.26.0

; Require at least Windows XP
MinVersion=5.1

ArchitecturesAllowed=
ArchitecturesInstallIn64BitMode=

DefaultDirName={pf}\botan
DefaultGroupName=botan

SolidCompression=yes

OutputDir=.
OutputBaseFilename=botan-1.11.26-x86_32

[Types]
Name: "user"; Description: "User"
Name: "devel"; Description: "Developer"
Name: "custom"; Description: "Custom"; Flags: iscustom

[Components]
name: "dll"; Description: "Runtime DLLs"; Types: user devel custom; Flags: fixed
name: "implib"; Description: "Import Library"; Types: devel
name: "includes"; Description: "Include Files"; Types: devel
name: "docs"; Description: "Developer Documentation"; Types: devel

[Files]
; DLL and license file is always included
Source: "..\doc\license.rst"; DestDir: "{app}"; Components: dll; AfterInstall: ConvertLineEndings
Source: "..\botan.dll"; DestDir: "{app}"; Components: dll
Source: "..\botan.dll.manifest"; DestDir: "{app}"; Components: dll; Flags: skipifsourcedoesntexist

Source: "include\botan\*"; DestDir: "{app}\include\botan"; Components: includes; AfterInstall: ConvertLineEndings

Source: "..\doc\*.rst"; DestDir: "{app}\doc"; Excludes: "license.rst"; Components: docs; AfterInstall: ConvertLineEndings

Source: "..\doc\examples\*.cpp"; DestDir: "{app}\doc\examples"; Components: docs; AfterInstall: ConvertLineEndings

Source: "..\botan.exp"; DestDir: "{app}"; Components: implib
Source: "..\botan.lib"; DestDir: "{app}"; Components: implib

[Code]
const
   LF = #10;
   CR = #13;
   CRLF = CR + LF;

procedure ConvertLineEndings();
  var
     FilePath : String;
     FileContents : String;
begin
   FilePath := ExpandConstant(CurrentFileName)

   if ExtractFileName(CurrentFileName) <> 'build.h' then
   begin
      LoadStringFromFile(FilePath, FileContents);
      StringChangeEx(FileContents, LF, CRLF, False);
      SaveStringToFile(FilePath, FileContents, False);
   end;
end;
