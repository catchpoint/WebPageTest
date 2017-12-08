#pragma once

#define SHAPER_DEVICE_NAME     L"\\Device\\TrafficShaper"
#define SHAPER_SYMBOLIC_NAME   L"\\DosDevices\\Global\\TrafficShaper"
#define SHAPER_DOS_NAME        L"\\\\.\\TrafficShaper"
#define SHAPER_SERVICE_NAME    L"shaper"
#define SHAPER_SERVICE_DISPLAY_NAME L"Traffic Shaper Driver"

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

typedef struct {
  BOOLEAN       enabled;           // If traffic shaping is enabled
  SHAPER_PARAMS params;            // connection settings
  unsigned __int64 inQueuedBytes;  // Size of the pending data in the inbound queue
  unsigned __int64 outQueuedBytes; // Size of the pending data in the inbound queue
} SHAPER_STATUS;

typedef struct {
  unsigned __int64 inBytes;    // Amount of data received (delivered to the OS, after all queues) since starting
  unsigned __int64 inPackets;  // Number of packets received (delivered to the OS, after all queues) since starting
  unsigned __int64 outBytes;   // Amount of data transmitted (delivered to the net, after all queues) since starting
  unsigned __int64 outPackets; // Number of packets transmitted (delivered to the net, after all queues) since starting
} SHAPER_STATS;
#pragma pack(pop)

// from ntifs.h
#ifndef FILE_DEVICE_NETWORK 
#define FILE_DEVICE_NETWORK             0x00000012
#endif

#ifndef METHOD_BUFFERED
#define METHOD_BUFFERED                 0
#endif

#ifndef FILE_READ_ACCESS
#define FILE_READ_ACCESS          ( 0x0001 )    // file & pipe
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
#define	SHAPER_IOCTL_GET_STATUS CTL_CODE(FILE_DEVICE_NETWORK, 0x803, METHOD_BUFFERED, FILE_READ_ACCESS)
#define	SHAPER_IOCTL_GET_STATS CTL_CODE(FILE_DEVICE_NETWORK, 0x804, METHOD_BUFFERED, FILE_READ_ACCESS)
