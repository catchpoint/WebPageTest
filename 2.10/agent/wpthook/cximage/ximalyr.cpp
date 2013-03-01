// xImaLyr.cpp : Layers functions
/* 21/04/2003 v1.00 - Davide Pizzolato - www.xdp.it
 * CxImage version 7.0.1 07/Jan/2011
 */

#include "ximage.h"

#if CXIMAGE_SUPPORT_LAYERS

////////////////////////////////////////////////////////////////////////////////
/**
 * If the object is an internal layer, GetParent return its parent in the hierarchy.
 */
CxImage* CxImage::GetParent() const
{
	return info.pParent;
}
////////////////////////////////////////////////////////////////////////////////
/**
 * Number of layers allocated directly by the object.
 */
int32_t CxImage::GetNumLayers() const
{
	return info.nNumLayers;
}
////////////////////////////////////////////////////////////////////////////////
/**
 * Creates an empty layer. If position is less than 0, the new layer will be placed in the last position
 */
bool CxImage::LayerCreate(int32_t position)
{
	if ( position < 0 || position > info.nNumLayers ) position = info.nNumLayers;

	CxImage** ptmp = new CxImage*[info.nNumLayers + 1];
	if (ptmp==0) return false;

	int32_t i=0;
	for (int32_t n=0; n<info.nNumLayers; n++){
		if (position == n){
			ptmp[n] = new CxImage();
			i=1;
		}
		ptmp[n+i]=ppLayers[n];
	}
	if (i==0) ptmp[info.nNumLayers] = new CxImage();

	if (ptmp[position]){
		ptmp[position]->info.pParent = this;
	} else {
		free(ptmp);
		return false;
	}

	info.nNumLayers++;
	delete [] ppLayers;
	ppLayers = ptmp;
	return true;
}
////////////////////////////////////////////////////////////////////////////////
/**
 * Deletes a layer. If position is less than 0, the last layer will be deleted
 */
bool CxImage::LayerDelete(int32_t position)
{
	if ( position >= info.nNumLayers ) return false;
	if ( position < 0) position = info.nNumLayers - 1;
	if ( position < 0) return false;

	if (info.nNumLayers>1){

		CxImage** ptmp = new CxImage*[info.nNumLayers - 1];
		if (ptmp==0) return false;

		int32_t i=0;
		for (int32_t n=0; n<info.nNumLayers; n++){
			if (position == n){
				delete ppLayers[n];
				i=1;
			}
			ptmp[n]=ppLayers[n+i];
		}

		info.nNumLayers--;
		delete [] ppLayers;
		ppLayers = ptmp;

	} else {
		delete ppLayers[0];
		delete [] ppLayers;
		ppLayers = 0;
		info.nNumLayers = 0;
	}
	return true;
}
////////////////////////////////////////////////////////////////////////////////
void CxImage::LayerDeleteAll()
{
	if (ppLayers) { 
		for(int32_t n=0; n<info.nNumLayers;n++){ delete ppLayers[n]; }
		delete [] ppLayers; ppLayers=0; info.nNumLayers = 0;
	}
}
////////////////////////////////////////////////////////////////////////////////
/**
 * Returns a pointer to a layer. If position is less than 0, the last layer will be returned
 */
CxImage* CxImage::GetLayer(int32_t position)
{
	if ( ppLayers == NULL) return NULL;
	if ( info.nNumLayers == 0) return NULL;
	if ( position >= info.nNumLayers ) return NULL;
	if ( position < 0) position = info.nNumLayers - 1;
	return ppLayers[position];
}
////////////////////////////////////////////////////////////////////////////////
#endif //CXIMAGE_SUPPORT_LAYERS
