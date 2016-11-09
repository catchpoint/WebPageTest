#pragma once

#define SHAPER_DEVICE_NAME     L"\\Device\\TrafficShaper"
#define SHAPER_SYMBOLIC_NAME   L"\\DosDevices\\Global\\TrafficShaper"
#define SHAPER_DOS_NAME        L"\\\\.\\TrafficShaper"
#define SHAPER_SERVICE_NAME    L"shaper"

#pragma pack(push, 8)
typedef struct {
  unsigned short   plr;            // Packet loss rate in hundreths of % (0-10000, i.e. 10% packet loss = 1000)
  unsigned __int64 inBps;          // Inbound bandwidth in bits-per-second
  unsigned __int64 outBps;         // Outbound bandwidth in bits-per-second
  unsigned long    inLatency;      // Inbound latency in milliseconds
  unsigned long    outLatency;     // Outbound latency in milliseconds
  unsigned __int64 inBufferBytes;  // Size of inbound packet buffer in bytes (drop packets that overflow). 150,000 Matches the dummynet default
  unsigned __int64 outBufferBytes; // Size of outbound packet buffer in bytes (drop packets that overflow). 150,000 Matches the dummynet default
} SHAPER_PARAMS;
#pragma pack(pop)

// from ntifs.h
#ifndef FILE_DEVICE_NETWORK 
#define FILE_DEVICE_NETWORK             0x00000012
#endif

#ifndef METHOD_BUFFERED
#define METHOD_BUFFERED                 0
#endif

#ifndef FILE_WRITE_ACCESS
#define FILE_WRITE_ACCESS         ( 0x0002 )    // file & pipe
#endif

#ifndef CTL_CODE
#define CTL_CODE( DeviceType, Function, Method, Access ) (                 \
    ((DeviceType) << 16) | ((Access) << 14) | ((Function) << 2) | (Method) \
)
#endif

#define	SHAPER_IOCTL_DISABLE  CTL_CODE(FILE_DEVICE_NETWORK, 0x801, METHOD_BUFFERED, FILE_WRITE_ACCESS)
#define	SHAPER_IOCTL_ENABLE CTL_CODE(FILE_DEVICE_NETWORK, 0x802, METHOD_BUFFERED, FILE_WRITE_ACCESS)
