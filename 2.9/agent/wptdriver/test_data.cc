#include "StdAfx.h"
#include "test_data.h"


TestData::TestData(void)
{
}


TestData::~TestData(void)
{
}

bool TestData::BuildFormData(WptSettings& settings, WptTest& test, 
                            CString& headers, CStringA& footer, 
                            CStringA& form_data, DWORD& content_length){
  bool ret = true;

  footer = "";
  form_data = "";

	CStringA boundary = "----------ThIs_Is_tHe_bouNdaRY";
	GUID guid;
	if( SUCCEEDED(CoCreateGuid(&guid)) )
		boundary.Format("----------%08X%04X%04X%X%X%X%X%X%X%X%X",guid.Data1, guid.Data2, guid.Data3, guid.Data4[0], guid.Data4[1], guid.Data4[2], guid.Data4[3], guid.Data4[4], guid.Data4[5], guid.Data4[6], guid.Data4[7]);
	
	headers = CString("Content-Type: multipart/form-data; boundary=") + 
              CString(CA2T(boundary)) + _T("\r\n");

	// location
	form_data += CStringA("--") + boundary + "\r\n";
	form_data += "Content-Disposition: form-data; name=\"location\"\r\n\r\n";
  form_data += CStringA(CT2A(settings._location)) + "\r\n";

	// key
  if( settings._key.GetLength() ){
	  form_data += CStringA("--") + boundary + "\r\n";
	  form_data += "Content-Disposition: form-data; name=\"key\"\r\n\r\n";
    form_data += CStringA(CT2A(settings._key)) + "\r\n";
  }

	// id
	form_data += CStringA("--") + boundary + "\r\n";
	form_data += "Content-Disposition: form-data; name=\"id\"\r\n\r\n";
  form_data += CStringA(CT2A(test._id)) + "\r\n";

  // done flag
	form_data += CStringA("--") + boundary + "\r\n";
	form_data += "Content-Disposition: form-data; name=\"done\"\r\n\r\n";
	form_data += "1\r\n";

	footer += CStringA("--") + boundary + "--\r\n";

	content_length = form_data.GetLength() + footer.GetLength();
	CString buff;
	buff.Format(_T("Content-Length: %u\r\n"), content_length);
	headers += buff;

  return ret;
}