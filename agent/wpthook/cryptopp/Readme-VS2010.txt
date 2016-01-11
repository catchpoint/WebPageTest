This archive contains the solution and project files for Visual Studio 2010 and above. Unzip them over the existing Visual Studio 2005 solution and project files, if desired.

The project distributes the original VS2005 files for two reasons. First, it allows use of and testing on earlier versions of Visual Studio. Second it avoids placing a barrier for entry. For example, Visual Studio 2015 Community is an expiring trial, so the project does not want to force users to upgrade or buy it. Confer, http://blogs.msdn.com/b/visualstudio/archive/2015/08/07/visual-studio-2015-faq.aspx.

If you attempt to use Crypto++ after a VS2010 VCUpgrade, only 10 or so of the 24 configurations will build. Microsoft made considerable changes to MSBuild and it indirectly broke a lot of projects. Confer, http://blogs.msdn.com/b/vcblog/archive/2010/03/02/visual-studio-2010-c-project-upgrade-guide.aspx and http://blogs.msdn.com/b/vcblog/archive/2010/02/16/project-settings-changes-with-vs2010.aspx.

The solution and project files in this archive should fix most of the issues after VCUpgrade, and allow you to build all the configurations under Visual Studio 2010 and above.
