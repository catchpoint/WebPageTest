// dllmain.h : Declaration of module class.

class CwptbhoModule : public ATL::CAtlDllModuleT< CwptbhoModule >
{
public :
	DECLARE_LIBID(LIBID_wptbhoLib)
	DECLARE_REGISTRY_APPID_RESOURCEID(IDR_WPTBHO, "{1BFA0FD6-FD90-4A5D-8C66-1F890EAE2B14}")
};

extern class CwptbhoModule _AtlModule;
