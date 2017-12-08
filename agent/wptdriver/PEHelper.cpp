#include "stdafx.h"
#include "PEHelper.h"

CPEHelper::CPEHelper(void) {
	m_hFile = INVALID_HANDLE_VALUE;
	m_hFileMapping = NULL;
	m_pBuffer = NULL;
	m_pImageDosHeader = NULL;
	m_pImageFileHeader = NULL;
	m_pNtHeader = NULL;
	m_dwMchine = 0;
}

CPEHelper::~CPEHelper(void) {
	InternalClean();
}

VOID CPEHelper::InternalClean() {
	if (m_pBuffer) {
		::UnmapViewOfFile(m_pBuffer);
		m_pBuffer = NULL;
	}

	if (m_hFileMapping) {
		::CloseHandle(m_hFileMapping);
		m_hFileMapping = NULL;
	}

	if (INVALID_HANDLE_VALUE != m_hFile) {
		::CloseHandle(m_hFile);
		m_hFile = INVALID_HANDLE_VALUE;
	}

	m_pImageDosHeader = NULL;
	m_pImageFileHeader = NULL;
	m_pNtHeader = NULL;
	m_dwMchine = 0;
}

ULONG CPEHelper::RVAToFOA(DWORD ulRva) {
	if (m_pNtHeader && m_pImageFileHeader) {
		PIMAGE_SECTION_HEADER pImageSectionHeader =
			((PIMAGE_SECTION_HEADER) ((ULONG_PTR)(m_pImageFileHeader) + sizeof(IMAGE_FILE_HEADER) + m_pImageFileHeader->SizeOfOptionalHeader));

		for(int i=0; i < m_pImageFileHeader->NumberOfSections; i++) {
			if ((ulRva >= pImageSectionHeader[i].VirtualAddress) && 
				(ulRva <= pImageSectionHeader[i].VirtualAddress + pImageSectionHeader[i].SizeOfRawData)) {
				return pImageSectionHeader[i].PointerToRawData + (ulRva - pImageSectionHeader[i].VirtualAddress);
			} 
		}
	}

	return 0;
}

bool CPEHelper::OpenAndVerify(LPCTSTR pFilePathName) {
	bool ok = false;

	m_hFile = ::CreateFile(pFilePathName, GENERIC_READ, FILE_SHARE_READ, NULL, OPEN_EXISTING, NULL, NULL);
  if (m_hFile != INVALID_HANDLE_VALUE){
	  m_hFileMapping = ::CreateFileMapping(m_hFile, 0, PAGE_READONLY, 0, 0, NULL);
	  if (m_hFileMapping) {
	    m_pBuffer = ::MapViewOfFile(m_hFileMapping, FILE_MAP_READ, 0, 0, 0);
      if (m_pBuffer) {
	      DWORD dwFileSize = GetFileSize(m_hFile, NULL);
	      if (dwFileSize != INVALID_FILE_SIZE && dwFileSize > sizeof(IMAGE_DOS_HEADER)) {
	        m_pImageDosHeader = (PIMAGE_DOS_HEADER)(m_pBuffer);
	        if (m_pImageDosHeader->e_magic == IMAGE_DOS_SIGNATURE) {
	          DWORD dwE_lfanew = m_pImageDosHeader->e_lfanew;
	          ULONG ulAddressTemp = PtrToUlong(m_pBuffer) + dwE_lfanew;
	          DWORD dwPESignature  = *((PDWORD)ULongToPtr(ulAddressTemp));
	          if (dwPESignature == IMAGE_NT_SIGNATURE) {
	            m_pNtHeader = ULongToPtr(ulAddressTemp);
	            ulAddressTemp = ulAddressTemp + sizeof(IMAGE_NT_SIGNATURE);
	            m_pImageFileHeader = (PIMAGE_FILE_HEADER)ULongToPtr(ulAddressTemp);
	            if (IMAGE_FILE_MACHINE_I386 == m_pImageFileHeader->Machine) {
		            PIMAGE_NT_HEADERS32 pImageNtHeader32 = (PIMAGE_NT_HEADERS32)m_pNtHeader;
		            if (pImageNtHeader32->OptionalHeader.Magic == IMAGE_NT_OPTIONAL_HDR32_MAGIC) {
		              m_dwMchine = IMAGE_FILE_MACHINE_I386;
                  ok = true;
                }
	            } else if(m_pImageFileHeader->Machine == IMAGE_FILE_MACHINE_AMD64) {
		            PIMAGE_NT_HEADERS64 pImageNtHeader64 = (PIMAGE_NT_HEADERS64)m_pNtHeader;
		            if (pImageNtHeader64->OptionalHeader.Magic == IMAGE_NT_OPTIONAL_HDR64_MAGIC) {
		              m_dwMchine = IMAGE_FILE_MACHINE_AMD64;
                  ok = true;
                }
	            }
            }
          }
        }
      }
    }
  }

  if (!ok)
	  InternalClean();

	return ok;
}

void CPEHelper::GetPDBInfo(CString& strPDBSignature, DWORD& dwPDBAge) {
	strPDBSignature.Empty();
	dwPDBAge = 0;

	if (NULL == m_pNtHeader)
		return;

	ULONG ulDebugDirectoryRVA = 0;
	int nDirectoryItemCount = 0;

	if (IMAGE_FILE_MACHINE_I386 == m_dwMchine) {
		PIMAGE_NT_HEADERS32 pImageNtHeader32 = (PIMAGE_NT_HEADERS32)m_pNtHeader;
		ulDebugDirectoryRVA = pImageNtHeader32->OptionalHeader.DataDirectory[IMAGE_DIRECTORY_ENTRY_DEBUG].VirtualAddress;
		DWORD dwSize = pImageNtHeader32->OptionalHeader.DataDirectory[IMAGE_DIRECTORY_ENTRY_DEBUG].Size;
		nDirectoryItemCount = dwSize / sizeof(IMAGE_DEBUG_DIRECTORY);
	} else if(IMAGE_FILE_MACHINE_AMD64 == m_dwMchine) {
		PIMAGE_NT_HEADERS64 pImageNtHeader64 = (PIMAGE_NT_HEADERS64)m_pNtHeader;
		ulDebugDirectoryRVA = pImageNtHeader64->OptionalHeader.DataDirectory[IMAGE_DIRECTORY_ENTRY_DEBUG].VirtualAddress;
		DWORD dwSize = pImageNtHeader64->OptionalHeader.DataDirectory[IMAGE_DIRECTORY_ENTRY_DEBUG].Size;
		nDirectoryItemCount = dwSize / sizeof(IMAGE_DEBUG_DIRECTORY);
	} else {
		return;
	}

	ULONG ulDebugDirectoryFOA = (ULONG)(RVAToFOA(ulDebugDirectoryRVA) + (ULONG_PTR)m_pImageDosHeader);
	PIMAGE_DEBUG_DIRECTORY pImageDebugDirectory = (PIMAGE_DEBUG_DIRECTORY)ULongToPtr(ulDebugDirectoryFOA);

	for (int i=0; i<nDirectoryItemCount; i++) {
		if (IMAGE_DEBUG_TYPE_CODEVIEW == pImageDebugDirectory[i].Type) {
			PVOID pDebugInfoRawData = (PVOID) ((ULONG_PTR)m_pImageDosHeader + pImageDebugDirectory[i].PointerToRawData);

			if (pDebugInfoRawData) {
				DWORD dwCvSignature = *((PDWORD) pDebugInfoRawData);

				switch (dwCvSignature) {
				  case CV_SIGNATURE_NB09:
				  case CV_SIGNATURE_NB10: {
						  PCV_INFO_PDB20 pCvInfoPdb = ((PCV_INFO_PDB20) pDebugInfoRawData);

						  strPDBSignature.Format(_T("%08X"), pCvInfoPdb->dwSignature);
						  dwPDBAge = pCvInfoPdb->dwAge;
					  } break;
				  case CV_SIGNATURE_RSDS: {
						  PCV_INFO_PDB70 pCvInfoPdb = ((PCV_INFO_PDB70) pDebugInfoRawData);

						  strPDBSignature.Format(
							  _T("%08X%04X%04X%02X%02X%02X%02X%02X%02X%02X%02X"),
							  pCvInfoPdb->Signature.Data1, pCvInfoPdb->Signature.Data2, pCvInfoPdb->Signature.Data3,
							  pCvInfoPdb->Signature.Data4[0], pCvInfoPdb->Signature.Data4[1],			
							  pCvInfoPdb->Signature.Data4[2], pCvInfoPdb->Signature.Data4[3],			
							  pCvInfoPdb->Signature.Data4[4], pCvInfoPdb->Signature.Data4[5],			
							  pCvInfoPdb->Signature.Data4[6], pCvInfoPdb->Signature.Data4[7]);
						  dwPDBAge = pCvInfoPdb->dwAge;
					  } break;
				  default:
					  break;
				}
			}
		}
	}

	return ;
}

void CPEHelper::GetBinFileIndex(CString& strIndex) {
	strIndex.Empty();
	if (NULL == m_pNtHeader) {
		return ;
	}

	DWORD dwTimeDateStamp = 0;
	DWORD dwSizeofImage = 0;

	if (IMAGE_FILE_MACHINE_I386 == m_dwMchine) {
		PIMAGE_NT_HEADERS32 pImageNtHeader32 = (PIMAGE_NT_HEADERS32)m_pNtHeader;

		dwTimeDateStamp = pImageNtHeader32->FileHeader.TimeDateStamp;
		dwSizeofImage = pImageNtHeader32->OptionalHeader.SizeOfImage;
	} else if(IMAGE_FILE_MACHINE_AMD64 == m_dwMchine) {
		PIMAGE_NT_HEADERS64 pImageNtHeader64 =  (PIMAGE_NT_HEADERS64)m_pNtHeader;

		dwTimeDateStamp = pImageNtHeader64->FileHeader.TimeDateStamp;
		dwSizeofImage = pImageNtHeader64->OptionalHeader.SizeOfImage;
	} else {
		return;
	}

	strIndex.Format(_T("%08X%X"), dwTimeDateStamp, dwSizeofImage);

	return ;
}

void CPEHelper::GetPdbFileIndex(CString& strIndex) {
	strIndex.Empty();
	CString strGuid;
	DWORD dwAge;

	GetPDBInfo(strGuid, dwAge);
	if (strGuid.IsEmpty()) {
		return;
	}

	strIndex.Format(_T("%s%x"), strGuid, dwAge);

	return ;
}
