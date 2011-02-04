#include <stdafx.h>
#include "aft.h"

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
CAFT::CAFT(DWORD testEndTime, DWORD earlyCutoff, DWORD pixelChangesThreshold):
  lastImg(NULL)
  , width(0)
  , height(0)
  , pixelChangeTime(NULL)
  , pixelChangeCount(NULL)
  , early_cutoff(earlyCutoff)
  , pixel_changes_threshold(pixelChangesThreshold)
  , msEnd(testEndTime)
{
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
CAFT::~CAFT(void)
{
  if( pixelChangeTime )
    free( pixelChangeTime );
  if( pixelChangeCount )
    free( pixelChangeCount );
}

/*-----------------------------------------------------------------------------
  Keep track of the changes as images are added
-----------------------------------------------------------------------------*/
void CAFT::AddImage( CxImage * img, DWORD ms )
{
  if( img && img->IsValid() && img->GetWidth() && img->GetHeight() )
  {
    if( lastImg )
    {
      // go through each pixel and check for deltas from the previous image
      if( img->GetWidth() == width && img->GetHeight() == height )
      {
        DWORD changeCount = 0;

        // this could be optimized instead of fetching each pixel individually
        DWORD i = 0;
        for( DWORD y = 0; y < height; y++ )
          for( DWORD x = 0; x < width; x++ )
          {
            RGBQUAD last = lastImg->GetPixelColor(x, y, false);
            RGBQUAD current = img->GetPixelColor(x, y, false);

            if( last.rgbBlue != current.rgbBlue || last.rgbGreen != current.rgbGreen || last.rgbRed != current.rgbRed )
            {
              pixelChangeCount[i]++;
              if( ms <= msEnd )
                pixelChangeTime[i] = ms;
              changeCount++;
            }

            i++;
          }

        ATLTRACE(_T("[Pagetest] - Adding video frame at %d ms out of %d ms, %d changes detected\n"), ms, msEnd, changeCount);
      }
    }
    else
    {
      // first-time setup
      width = img->GetWidth();
      height = img->GetHeight();

      pixelChangeTime = (DWORD *)malloc(width * height * sizeof(DWORD));
      pixelChangeCount = (DWORD *)malloc(width * height * sizeof(DWORD));

      memset(pixelChangeTime, 0, width * height * sizeof(DWORD));
      memset(pixelChangeCount, 0, width * height * sizeof(DWORD));
    }

    lastImg = img;
  }
}

/*-----------------------------------------------------------------------------
  Do all the calculations as each image is added
-----------------------------------------------------------------------------*/
bool CAFT::Calculate( DWORD &ms, bool &confident )
{
  bool ret = false;

  if( lastImg )
  {
    DWORD latest_of_early = 0;
    DWORD latest_of_static = 0;
    confident = true;

    ATLTRACE(_T("[Pagetest] - Calculating AFT\n"));

    // go through the timings for each pixel
    DWORD i = 0;
    for( DWORD y = 0; y < height; y++ )
      for( DWORD x = 0; x < width; x++ )
      {
        DWORD changeCount = pixelChangeCount[i];
        DWORD lastChange = pixelChangeTime[i];

        // see if this is a "stable" pixel
        if( changeCount < pixel_changes_threshold )
        {
          if( lastChange > latest_of_static && lastChange < msEnd )
          {
            latest_of_static = lastChange;
            ATLTRACE(_T("[Pagetest] - Latest static updated to %d ms\n"), latest_of_static);
          }

          // did it stabilize early (used for the confidence)?
          if( lastChange < early_cutoff )
          {
            if( lastChange > latest_of_early )
              latest_of_early = lastChange;
          }
          else
            confident = false;

          i++;
        }
      }

    if( latest_of_static )
    {
      ret = true;
      ms = latest_of_static;
      ATLTRACE(_T("[Pagetest] - AFT Calculated: %d ms\n"), latest_of_static);
    }
  }

  return ret;
}
