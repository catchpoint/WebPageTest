#include <stdafx.h>
#include "aft.h"

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
CAFT::CAFT(DWORD testEndTime, DWORD earlyCutoff, DWORD pixelChangesThreshold):
  lastImg(NULL)
  , width(0)
  , height(0)
  , pixelChangeTime(NULL)
  , firstPixelChangeTime(NULL)
  , pixelChangeCount(NULL)
  , early_cutoff(earlyCutoff)
  , pixel_changes_threshold(pixelChangesThreshold)
  , msEnd(testEndTime)
{
  crop.top = 0;
  crop.left = 0;
  crop.bottom = 0;
  crop.right = 0;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
CAFT::~CAFT(void)
{
  if( pixelChangeTime )
    free( pixelChangeTime );
  if( firstPixelChangeTime )
    free( firstPixelChangeTime );
  if( pixelChangeCount )
    free( pixelChangeCount );
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CAFT::SetCrop( DWORD top, DWORD right, DWORD bottom, DWORD left )
{
  crop.top = top;
  crop.right = right;
  crop.bottom = bottom;
  crop.left = left;
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
        for( DWORD y = crop.bottom; y < height - crop.top; y++ )
          for( DWORD x = crop.left; x < width - crop.right; x++ )
          {
            RGBQUAD last = lastImg->GetPixelColor(x, y, false);
            RGBQUAD current = img->GetPixelColor(x, y, false);

            if( last.rgbBlue != current.rgbBlue || last.rgbGreen != current.rgbGreen || last.rgbRed != current.rgbRed )
            {
              pixelChangeCount[i]++;
              if( !msEnd || ms <= msEnd )
              {
                pixelChangeTime[i] = ms;
                if( !firstPixelChangeTime[i] )
                  firstPixelChangeTime[i] = ms;
              }
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

      pixelChangeTime = (DWORD *)malloc((width - crop.left - crop.right) * (height - crop.top - crop.bottom) * sizeof(DWORD));
      firstPixelChangeTime  = (DWORD *)malloc((width - crop.left - crop.right) * (height - crop.top - crop.bottom) * sizeof(DWORD));
      pixelChangeCount = (DWORD *)malloc((width - crop.left - crop.right) * (height - crop.top - crop.bottom) * sizeof(DWORD));

      memset(pixelChangeTime, 0, (width - crop.left - crop.right) * (height - crop.top - crop.bottom) * sizeof(DWORD));
      memset(firstPixelChangeTime, 0, (width - crop.left - crop.right) * (height - crop.top - crop.bottom) * sizeof(DWORD));
      memset(pixelChangeCount, 0, (width - crop.left - crop.right) * (height - crop.top - crop.bottom) * sizeof(DWORD));
    }

    lastImg = img;
  }
}

/*-----------------------------------------------------------------------------
  After all of the images have been added this will go through
  and look for the latest change for any pixel that isn't considered
  dynamic
-----------------------------------------------------------------------------*/
bool CAFT::Calculate( DWORD &ms, bool &confident, CxImage * imgAft )
{
  bool ret = false;

  if( lastImg )
  {
    DWORD latest_of_first = 0;
    DWORD latest_of_static = 0;
    confident = true;

    ATLTRACE(_T("[Pagetest] - Calculating AFT\n"));

    // create the image of the AFT algorithm
    if( imgAft )
    {
      imgAft->Create(width, height, 24);
      imgAft->Clear();
    }

    // go through the timings for each pixel
    DWORD i = 0;
    for( DWORD y = crop.bottom; y < height - crop.top; y++ )
      for( DWORD x = crop.left; x < width - crop.right; x++ )
      {
        DWORD changeCount = pixelChangeCount[i];
        DWORD lastChange = pixelChangeTime[i];
        DWORD firstChange = firstPixelChangeTime[i];

        // keep track of the first change time for each pixel
        if( firstChange > latest_of_first && (!msEnd || firstChange <= msEnd) )
          latest_of_first = firstChange;

        // see if this is a "stable" pixel
        if( changeCount )
        {
          if( changeCount < pixel_changes_threshold )
          {
            if( lastChange > latest_of_static && (!msEnd || lastChange <= msEnd) )
            {
              latest_of_static = lastChange;
              ATLTRACE(_T("[Pagetest] - Latest static updated to %d ms\n"), latest_of_static);
            }

            // did it stabilize early (used for the confidence)?
            if( lastChange >= early_cutoff )
            {
              confident = false;
              if(imgAft)
                imgAft->SetPixelColor(x,y, RGB(0,0,255));
            }
            else if(imgAft)
              imgAft->SetPixelColor(x,y, RGB(255,255,255));
          }
          else if(imgAft)
            imgAft->SetPixelColor(x,y, RGB(255,0,0));
        }
        else if(imgAft)
          imgAft->SetPixelColor(x,y, RGB(0,0,0));

        i++;
      }

    if( latest_of_static )
    {
      ret = true;
      ms = __max(latest_of_static, latest_of_first);
      ATLTRACE(_T("[Pagetest] - AFT Calculated: %d ms\n"), latest_of_static);

      // color the AFT pixels that defined the end time
      if( imgAft )
      {
        DWORD i = 0;
        for( DWORD y = crop.bottom; y < height - crop.top; y++ )
          for( DWORD x = crop.left; x < width - crop.right; x++ )
          {
            DWORD changeCount = pixelChangeCount[i];
            DWORD lastChange = pixelChangeTime[i];
            DWORD firstChange = firstPixelChangeTime[i];

            if( changeCount && changeCount < pixel_changes_threshold )
              if( lastChange == ms || firstChange == ms )
                imgAft->SetPixelColor(x,y, RGB(0,255,0));

            i++;
          }
      }
    }
  }

  return ret;
}
