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
  CxImage * lastImg;
  DWORD width;
  DWORD height;
  DWORD * pixelChangeTime;
  DWORD * pixelChangeCount;
  DWORD msEnd;

  bool  determined;
};
