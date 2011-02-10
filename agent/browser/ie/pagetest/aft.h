class CAFT
{
public:
  CAFT(DWORD testEndTime, DWORD earlyCutoff = 25000, DWORD pixelChangesThreshold = 5);
  ~CAFT(void);

  void AddImage( CxImage * img, DWORD ms );
  bool Calculate( DWORD &ms, bool &confident );

  DWORD pixel_changes_threshold;
  DWORD early_cutoff;

private:
  CxImage * lastImg;            // stores the previos image in the sequence as images are submitted
  DWORD width;                  // expected width of video images (all must be the same size)
  DWORD height;                 // expected height of video images (all must be the same size)
  DWORD * pixelChangeTime;      // For each pixel, the latest time the pixel changed (in ms)
  DWORD * firstPixelChangeTime; // For each pixel, the first time it changed
  DWORD * pixelChangeCount;     // For each pixel, the number of times it changed
  DWORD msEnd;                  // The end time of the page measurement (only look for an AFT before this time)
};
