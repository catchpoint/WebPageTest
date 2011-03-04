#pragma once
class Results
{
public:
  Results(void);
  ~Results(void);

  void Reset(void);
  void Save(void);

  // test information
  CString _url;

  // high-level metrics
  int _on_load_time;
  int _activity_time;

private:
  CString _file_base;

  void SavePageData(void);
};

