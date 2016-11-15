"""
Copyright 2016 Google Inc. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
"""
import subprocess

class ETW:
  def __init__(self):
    self.log_file = None
    self.trace_name = None
    self.kernel_categories = []
    #self.kernel_categories = ['latency']
    self.user_categories = ['Microsoft-IE',
                            #'Microsoft-IEFRAME',
                            #'Microsoft-JScript',
                            #'Microsoft-PerfTrack-IEFRAME',
                            #'Microsoft-PerfTrack-MSHTML',
                            #'Microsoft-Windows-DNS-Client',
                            #'Microsoft-Windows-Schannel-Events',
                            #'Microsoft-Windows-URLMon',
                            #'Microsoft-Windows-WebIO',
                            #'Microsoft-Windows-WinHttp',
                            'Microsoft-Windows-WinINet',
                            'Microsoft-Windows-WinINet-Capture',
                            #'Microsoft-Windows-Winsock-NameResolution',
                            #'Microsoft-Windows-Winsock-AFD:5',
                            #'37D2C3CD-C5D4-4587-8531-4696C44244C8' #Security: SChannel
                            ]

    # The list of events we actually care about
    self.keep_events = [# Page Navigation Events
                        'Microsoft-IE/Mshtml_CDoc_Navigation/Info', # Start of navigation, keep track of CMarkup* and EventContextId
                        'Microsoft-IE/Mshtml_WebOCEvents_DOMContentLoaded/Info', # CMarkup *
                        'Microsoft-IE/Mshtml_WebOCEvents_DocumentComplete/Info', # CMarkup*
                        'Microsoft-IE/Mshtml_WebOCEvents_NavigateComplete/Info', # CMarkup*
                        'Microsoft-IE/Mshtml_CMarkup_LoadEvent_Start/Start', # EventContextId
                        'Microsoft-IE/Mshtml_CMarkup_LoadEvent_Stop/Stop', # EventContextId
                        'Microsoft-IE/Mshtml_CMarkup_DOMContentLoadedEvent_Start/Start', # EventContextId
                        'Microsoft - IE / Mshtml_CMarkup_DOMContentLoadedEvent_Stop / Stop',  # EventContextId

                        # DNS - linked by etw:ActivityId
                        'Microsoft-Windows-WinINet/WININET_DNS_QUERY /Start',
                        'Microsoft-Windows-WinINet/WININET_DNS_QUERY /Stop',   # Lookup complete (includes address list)
                        'Microsoft-Windows-WinINet/Wininet_Getaddrinfo/Start', # Start of actual lookup
                        'Microsoft-Windows-WinINet/Wininet_Getaddrinfo/Stop',  # End of actual lookup

                        # Socket Connect - linked by etw:ActivityId to DNS
                        'Microsoft-Windows-WinINet/Wininet_SocketConnect/Start',    # Start of connection attempt, includes request #
                        'Microsoft-Windows-WinINet/Wininet_SocketConnect/Stop',     # End of connection attempt
                        'Microsoft-Windows-WinINet/WININET_TCP_CONNECTION /Start',  # Start of connection lifetime (after connected)
                        'Microsoft-Windows-WinINet/WININET_TCP_CONNECTION /Stop',   # End of connection lifetime (closed)
                        'Microsoft-Windows-WinINet/WININET_TCP_CONNECTION /Fail',
                        'Microsoft-Windows-WinINet/Wininet_Connect/Stop',

                        # TLS
                        'Microsoft-Windows-WinINet/WININET_HTTPS_NEGOTIATION /Start',
                        'Microsoft-Windows-WinINet/WININET_HTTPS_NEGOTIATION /Stop',

                        # Requests - linked by etw:ActivityId
                        'Microsoft-Windows-WinINet/WININET_REQUEST_HEADER /Info',   # Headers and size of outbound request - Length, Headers
                        'Microsoft-Windows-WinINet/WININET_RESPONSE_HEADER /Info',  # Headers and size of headers - Length, Headers
                        'Microsoft-Windows-WinINet/Wininet_SendRequest/Start',      # Request created (not necessarily sent) - AddressName (URL)
                        'Microsoft-Windows-WinINet/Wininet_SendRequest/Stop',       # Headers done - Direction changing for capture (no params)
                        'Microsoft-Windows-WinINet/Wininet_SendRequest_Main/Info',  # size of outbound request (and actual start) - Size
                        'Microsoft-Windows-WinINet/Wininet_ReadData/Info',          # inbound bytes (ttfb, keep incrementing end) - Size
                        'Microsoft-Windows-WinINet/Wininet_UsageLogRequest/Info',   # completely finished - URL, Verb, RequestHeaders, ResponseHeaders, Status, UsageLogRequestCache
                        'Microsoft-Windows-WinINet/Wininet_LookupConnection/Stop',  # Maps request to source port of connection "Socket" == local port
                        'Microsoft-Windows-WinINet/WININET_STREAM_DATA_INDICATED /Info', # Size
                        'Microsoft-Windows-WinINet-Capture//',                      # raw bytes (before encryption?_) and length - PayloadByteLength, Payload
                        ]

  def Start(self, log_file):
    ret = 0
    if len(self.kernel_categories) or len(self.user_categories):
      command = ['xperf']
      if len(self.kernel_categories):
        command.extend(['-on', '+'.join(self.kernel_categories)])
      command.append('-start')
      self.trace_name = 'WebPageTest'
      command.append(self.trace_name)
      if len(self.user_categories):
        command.extend(['-on', '+'.join(self.user_categories)])
      command.extend(['-BufferSize', '1024'])
      command.extend(['-f', log_file])
      print('Capturing ETW trace {0} to "{1}"'.format(self.trace_name,log_file))
      ret = subprocess.call(command, shell=True)
      self.started = True
      self.log_file = log_file
    return ret

  def Stop(self):
    ret = 0
    if self.trace_name is not None:
      print('Stopping ETW trace')
      command = ['xperf', '-stop', self.trace_name]
      ret = subprocess.call(command, shell=True)
    return ret

  def ExtractCsv(self, csv_file):
    ret = 0
    if self.log_file is not None:
      print('Converting ETW trace to CSV')
      command = ['xperf', '-i', self.log_file, '-o', csv_file, '-target', 'machine', '-tle', '-tti']
      ret = subprocess.call(command, shell=True)
    return ret

  def Parse(self, csv_file):
    events = []
    column_names = {}
    in_header = False
    header_parsed = False
    with open(csv_file, 'rb') as file:
      buffer = ''
      for line in file:
        if not in_header and not header_parsed and line == "BeginHeader\r\n":
          in_header = True
          buffer = ''
        elif in_header:
          buffer = ''
          if line == "EndHeader\r\n":
            header_parsed = True
            in_header = False
          else:
            columns = self.ExtractCsvLine(line)
            if len(columns):
              event_name = columns[0]
              if len(event_name):
                column_names[event_name] = columns
        else:
          buffer += line
          # line feeds in the data are escaped.  All real data lines end with \r\n
          if len(buffer) and line[-1] != "\r" and buffer[-3:] != "\r\r\n":
            buffer = buffer.replace("\r\r\n", "\r\n")
            columns = self.ExtractCsvLine(buffer)
            if len(columns):
              event_name = columns[0]
              if len(event_name) and event_name in column_names and event_name in self.keep_events:
                event = {'name': event_name, 'fields': {}}
                available_names = len(column_names[event_name])
                for i in xrange(1, len(columns)):
                  if i < available_names:
                    key = column_names[event_name][i]
                    value = columns[i]
                    if key == 'TimeStamp':
                      event['ts'] = int(value)
                    elif key == 'etw:ActivityId':
                      event['activity'] = value
                    else:
                      event['fields'][key] = value
                if 'ts' in event:
                  events.append(event)
            buffer = ''

    # sort the events by timestamp to make sure we process them in order
    if len(events):
      events.sort(key=lambda event: event['ts'])

    return events

  def ExtractCsvLine(self, csv):
    columns = []
    buffer = ''
    in_quote = False
    if csv[-2:] == "\r\n":
      csv = csv[:-2]
    length = len(csv)
    for i in xrange(0, length):
      if csv[i] == ',' and not in_quote:
        buffer = buffer.strip(' ')
        buffer = buffer.replace('""', '"')
        if len(buffer) > 1 and buffer[0] == '"' and buffer[-1] == '"':
          buffer = buffer[1:-1]
        columns.append(buffer)
        buffer = ''
      else:
        buffer += csv[i]
        if csv[i] == '"' and i < length - 1 and csv[i + 1] != '"':
            in_quote = not in_quote
    if len(buffer):
      buffer = buffer.strip(' ')
      buffer = buffer.replace('""', '"')
      if len(buffer) > 1 and buffer[0] == '"' and buffer[-1] == '"':
        buffer = buffer[1:-1]
      columns.append(buffer)
    return columns

  def ProcessEvents(self, events):
    result = {'pageData': {},
              'requests': {},
              'dns': {},
              'sockets': {}}
    dns = {}
    sockets = {}
    requests = {}
    pageContext = None
    CMarkup = None
    for event in events:
      if 'activity' in event:
        id = event['activity']
        if event['name'] == 'Microsoft-IE/Mshtml_CDoc_Navigation/Info':
          if 'EventContextId' in event['fields'] and 'CMarkup*' in event['fields']:
            pageContext = event['fields']['EventContextId']
            CMarkup = event['fields']['CMarkup*']
            if 'start' not in result:
              result['start'] = event['ts']
            if 'URL' in event['fields'] and 'URL' not in result:
              result['URL'] = event['fields']['URL']
        elif 'start' in result:
          # Page Navigation events
          if event['name'] == 'Microsoft-IE/Mshtml_WebOCEvents_DocumentComplete/Info':
            if 'CMarkup*' in event['fields'] and event['fields']['CMarkup*'] == CMarkup:
              result['pageData']['load'] = event['ts']
          if event['name'] == 'Microsoft-IE/Mshtml_CMarkup_LoadEvent_Start/Start':
            if 'EventContextId' in event['fields'] and event['fields']['EventContextId'] == pageContext:
              result['pageData']['loadEventStart'] = event['ts']
          if event['name'] == 'Microsoft-IE/Mshtml_CMarkup_LoadEvent_Stop/Stop':
            if 'EventContextId' in event['fields'] and event['fields']['EventContextId'] == pageContext:
              result['pageData']['loadEventEnd'] = event['ts']
          if event['name'] == 'Microsoft-IE/Mshtml_CMarkup_DOMContentLoadedEvent_Start/Start':
            if 'EventContextId' in event['fields'] and event['fields']['EventContextId'] == pageContext:
              result['pageData']['domContentLoadedEventStart'] = event['ts']
          if event['name'] == 'Microsoft - IE / Mshtml_CMarkup_DOMContentLoadedEvent_Stop / Stop':
            if 'EventContextId' in event['fields'] and event['fields']['EventContextId'] == pageContext:
              result['pageData']['domContentLoadedEventEnd'] = event['ts']

          # DNS
          if event['name'] == 'Microsoft-Windows-WinINet/WININET_DNS_QUERY /Start' and id not in dns:
            if 'HostName' in event['fields']:
              dns[id] = {'host': event['fields']['HostName']}
          if event['name'] == 'Microsoft-Windows-WinINet/WININET_DNS_QUERY /Stop' and id in dns:
            if 'AddressList' in event['fields']:
              dns[id]['addresses'] = list(filter(None, event['fields']['AddressList'].split(';')))
          if event['name'] == 'Microsoft-Windows-WinINet/Wininet_Getaddrinfo/Start' and id in dns:
            dns[id]['start'] = event['ts']
          if event['name'] == 'Microsoft-Windows-WinINet/Wininet_Getaddrinfo/Stop' and id in dns:
            dns[id]['end'] = event['ts']

          # Sockets
          if event['name'] == 'Microsoft-Windows-WinINet/Wininet_SocketConnect/Start' and id not in result['sockets']:
            result['sockets'][id] = {'start': event['ts']}
            if 'Socket' in event['fields']:
              result['sockets'][id]['socket'] = event['fields']['Socket']
            if 'SourcePort' in event['fields']:
              sockets[event['fields']['SourcePort']] = id # keep a mapping from the source port to the connection activity id
              result['sockets'][id]['srcPort'] = event['fields']['SourcePort']
            if 'RemoteAddressIndex' in event['fields']:
              result['sockets'][id]['addrIndex'] = event['fields']['RemoteAddressIndex']
          if event['name'] == 'Microsoft-Windows-WinINet/Wininet_SocketConnect/Stop' and id in result['sockets']:
            result['sockets'][id]['end'] = event['ts']
          if event['name'] == 'Microsoft-Windows-WinINet/WININET_TCP_CONNECTION /Start' and id in result['sockets']:
            if 'ServerName' in event['fields']:
              result['sockets'][id]['host'] = event['fields']['ServerName']
          if event['name'] == 'Microsoft-Windows-WinINet/WININET_TCP_CONNECTION /Stop' and id in result['sockets']:
            if 'end' not in result['sockets'][id]:
              result['sockets'][id]['end'] = event['ts']
            if 'srcPort' in result['sockets'][id] and result['sockets'][id]['srcPort'] in sockets:
              del sockets[result['sockets'][id]['srcPort']]
          if event['name'] == 'Microsoft-Windows-WinINet/WININET_TCP_CONNECTION /Fail' and id in result['sockets']:
            if 'end' not in result['sockets'][id]:
              result['sockets'][id]['end'] = event['ts']
            if 'Error' in event['fields']:
              result['sockets'][id]['error'] = event['fields']['Error']
          if event['name'] == 'Microsoft-Windows-WinINet/Wininet_Connect/Stop':
            if 'Socket' in event['fields'] and event['fields']['Socket'] in sockets:
              connect_id = sockets[event['fields']['Socket']]
              if connect_id in result['sockets']:
                if 'LocalAddress' in event['fields']:
                  result['sockets'][connect_id]['local'] = event['fields']['LocalAddress']
                if 'RemoteAddress' in event['fields']:
                  result['sockets'][connect_id]['remote'] = event['fields']['RemoteAddress']

          # TLS
          if event['name'] == 'Microsoft-Windows-WinINet/WININET_HTTPS_NEGOTIATION /Start' and id in result['sockets']:
            result['sockets'][id]['tlsStart' ] = event['ts']
          if event['name'] == 'Microsoft-Windows-WinINet/WININET_HTTPS_NEGOTIATION /Stop' and id in result['sockets']:
            result['sockets'][id]['tlsEnd' ] = event['ts']

          # Requests
          if event['name'] == 'Microsoft-Windows-WinINet/Wininet_SendRequest/Start':     # Request created (not necessarily sent) - AddressName (URL)
            if id not in requests:
              requests[id] = {}
            if 'AddressName' in event['fields'] and 'URL' not in requests[id]:
              requests[id]['URL'] = event['fields']['AddressName']
          if event['name'] == 'Microsoft-Windows-WinINet/WININET_REQUEST_HEADER /Info':  # Headers and size of outbound request - Length, Headers
            if id not in requests:
              requests[id] = {}
            if 'Headers' in event['fields']:
              requests[id]['outHeaders'] = event['fields']['Headers']
            if 'start' not in requests[id]:
              requests[id]['start'] = event['ts']
            if 'Length' in event['fields'] and 'outBytes' not in requests[id]:
              length = int(event['fields']['Length'])
              if length > 0:
                requests[id]['outBytes'] = length
          if event['name'] == 'Microsoft-Windows-WinINet/Wininet_SendRequest_Main/Info':  # size of outbound request (and actual start) - Size
            if id not in requests:
              requests[id] = {}
            requests[id]['start'] = event['ts']
            if 'Size' in event['fields']:
              length = int(event['fields']['Size'])
              if length > 0:
                requests[id]['outBytes'] = int(event['fields']['Size'])
          if event['name'] == 'Microsoft-Windows-WinINet/Wininet_LookupConnection/Stop':  # Maps request to source port of connection "Socket" == local port
            if 'Socket' in event['fields'] and event['fields']['Socket'] in sockets:
              if id not in requests:
                requests[id] = {}
              connect_id = sockets[event['fields']['Socket']]
              requests[id]['connection'] = connect_id
              if connect_id in result['sockets']:
                if 'requests' not in result['sockets'][connect_id]:
                  result['sockets'][connect_id]['requests'] = []
                result['sockets'][connect_id]['requests'].append(id)

          if event['name'] == 'Microsoft-Windows-WinINet/WININET_RESPONSE_HEADER /Info' and id in requests: # Headers and size of headers - Length, Headers
            requests[id]['end'] = event['ts']
            if 'firstByte' not in requests[id]:
              requests[id]['firstByte'] = event['ts']
            if 'Headers' in event['fields']:
              requests[id]['inHeaders'] = event['fields']['Headers']
            if 'Length' in event['fields']:
              requests[id]['inHeadersLen'] = int(event['fields']['Length'])
          if event['name'] == 'Microsoft-Windows-WinINet/Wininet_ReadData/Info' and id in requests:         # inbound bytes (ttfb, keep incrementing end) - Size
            if 'start' in requests[id]:
              requests[id]['end'] = event['ts']
              if 'firstByte' not in requests[id]:
                requests[id]['firstByte'] = event['ts']
              if 'Size' in event['fields']:
                if 'inBytes' not in requests[id]:
                  requests[id]['inBytes'] = 0
                requests[id]['inBytes'] += int(event['fields']['Size'])
            elif 'Size' in event['fields']:
              if 'inPreBytes' not in requests[id]:
                requests[id]['inPreBytes'] = 0
              requests[id]['inPreBytes'] += int(event['fields']['Size'])
          if event['name'] == 'Microsoft-Windows-WinINet/WININET_STREAM_DATA_INDICATED /Info' and id in requests:  # Size
            requests[id]['protocol'] = 'HTTP/2'
            if 'start' in requests[id]:
              requests[id]['end'] = event['ts']
              if 'firstByte' not in requests[id]:
                requests[id]['firstByte'] = event['ts']
              if 'Size' in event['fields']:
                if 'inBytes' not in requests[id]:
                  requests[id]['inBytes'] = 0
                requests[id]['inBytes'] += int(event['fields']['Size'])
            elif 'Size' in event['fields']:
              if 'inPreBytes' not in requests[id]:
                requests[id]['inPreBytes'] = 0
              requests[id]['inPreBytes'] += int(event['fields']['Size'])
          if event['name'] == 'Microsoft-Windows-WinINet/Wininet_UsageLogRequest/Info' and id in requests:  # completely finished - URL, Verb, RequestHeaders, ResponseHeaders, Status, UsageLogRequestCache
            if 'URL' in event['fields']:
              requests[id]['URL'] = event['fields']['URL']
            if 'Verb' in event['fields']:
              requests[id]['verb'] = event['fields']['Verb']
            if 'Status' in event['fields']:
              requests[id]['status'] = event['fields']['Status']
            if 'RequestHeaders' in event['fields']:
              requests[id]['outHeaders'] = event['fields']['RequestHeaders']
            if 'ResponseHeaders' in event['fields']:
              requests[id]['inHeaders'] = event['fields']['ResponseHeaders']
          if event['name'] == 'Microsoft-Windows-WinINet/Wininet_SendRequest/Stop' and id in requests:      # Headers done - Direction changing for capture (no params)
            if 'end' not in requests[id]:
              requests[id]['end'] = event['ts']
          if event['name'] == 'Microsoft-Windows-WinINet-Capture//' and id in requests:  # raw bytes (before encryption?_) and length - PayloadByteLength, Payload
            if 'PayloadByteLength' in event['fields'] and 'start' in requests[id]:
              length = int(event['fields']['PayloadByteLength'])
              if 'end' not in requests[id]:
                if 'capOutBytes' not in requests[id]:
                  requests[id]['capOutBytes'] = 0
                requests[id]['capOutBytes'] += length
              else:
                if 'capInBytes' not in requests[id]:
                  requests[id]['capInBytes'] = 0
                requests[id]['capInBytes'] += length

    # only report the DNS lookups that actually went on the wire
    for id in dns:
      if 'start' in dns[id]:
        result['dns'][id] = dns[id]

    # Fill in the host and address for any sockets that had a DNS entry (even if the DNS did not require a lookup)
    for id in result['sockets']:
      if id in dns:
        if 'host' not in result['sockets'][id] and 'host' in dns[id]:
          result['sockets'][id]['host'] = dns[id]['host']
        if 'addresses' in dns[id]:
          result['sockets'][id]['addresses'] = dns[id]['addresses']
          if 'addrIndex' in result['sockets'][id]:
            index = result['sockets'][id]['addrIndex']
            if index < len(dns[id]['addresses']):
              result['sockets'][id]['address'] = dns[id]['addresses'][index]

    # Only keep track of the requests that were actually sent
    for id in requests:
      if 'start' in requests[id]:
        result['requests'][id] = requests[id]

    # Copy over the connect and dns timings to the first request on a given socket.
    for id in result['sockets']:
      if 'requests' in result['sockets'][id]:
        firstRequest = None
        firstRequestTime = None
        count = len(result['sockets'][id]['requests'])
        for i in xrange(0, count):
          rid = result['sockets'][id]['requests'][i]
          if rid in result['requests']:
            if firstRequest is None or result['requests'][rid]['start'] < firstRequestTime:
              firstRequest = rid
              firstRequestTime = result['requests'][rid]['start']
        if firstRequest is not None:
          if 'start' in result['sockets'][id]:
            result['requests'][firstRequest]['connectStart'] = result['sockets'][id]['start']
          if 'end' in result['sockets'][id]:
            result['requests'][firstRequest]['connectEnd'] = result['sockets'][id]['end']
          if 'tlsStart' in result['sockets'][id]:
            result['requests'][firstRequest]['tlsStart'] = result['sockets'][id]['tlsStart']
          if 'tlsEnd' in result['sockets'][id]:
            result['requests'][firstRequest]['tlsEnd'] = result['sockets'][id]['tlsEnd']
          if id in dns:
            if 'start' in dns[id]:
              result['requests'][firstRequest]['dnsStart'] = dns[id]['start']
            if 'end' in dns[id]:
              result['requests'][firstRequest]['dnsEnd'] = dns[id]['end']

    # Calculate some page timings and adjust the start time to the start of actual activity
    if len(result['requests']):
      earliest = None
      latest = None
      if 'load' in result['pageData']:
        latest = result['pageData']['load']
      result['pageData']['inBytes'] = 0
      result['pageData']['outBytes'] = 0
      for id in result['requests']:
        if 'inBytes' in result['requests'][id]:
          result['pageData']['inBytes'] += result['requests'][id]['inBytes']
        if 'outBytes' in result['requests'][id]:
          result['pageData']['outBytes'] += result['requests'][id]['outBytes']
        if 'start' in result['requests'][id] and (earliest is None or result['requests'][id]['start'] < earliest):
          earliest = result['requests'][id]['start']
        if 'dnsStart' in result['requests'][id] and (earliest is None or result['requests'][id]['dnsStart'] < earliest):
          earliest = result['requests'][id]['dnsStart']
        if 'connectStart' in result['requests'][id] and (earliest is None or result['requests'][id]['connectStart'] < earliest):
          earliest = result['requests'][id]['connectStart']
        if 'tlsStart' in result['requests'][id] and (earliest is None or result['requests'][id]['tlsStart'] < earliest):
          earliest = result['requests'][id]['tlsStart']
        if 'start' in result['requests'][id] and (latest is None or result['requests'][id]['start'] > latest):
          latest = result['requests'][id]['start']
        if 'end' in result['requests'][id] and (latest is None or result['requests'][id]['end'] > latest):
          latest = result['requests'][id]['end']
        if 'dnsStart' in result['requests'][id] and (latest is None or result['requests'][id]['dnsStart'] > latest):
          latest = result['requests'][id]['dnsStart']
        if 'dnsEnd' in result['requests'][id] and (latest is None or result['requests'][id]['dnsEnd'] > latest):
          latest = result['requests'][id]['dnsEnd']
        if 'connectStart' in result['requests'][id] and (latest is None or result['requests'][id]['connectStart'] > latest):
          latest = result['requests'][id]['connectStart']
        if 'connectEnd' in result['requests'][id] and (latest is None or result['requests'][id]['connectEnd'] > latest):
          latest = result['requests'][id]['connectEnd']
        if 'tlsStart' in result['requests'][id] and (latest is None or result['requests'][id]['tlsStart'] > latest):
          latest = result['requests'][id]['tlsStart']
        if 'tlsEnd' in result['requests'][id] and (latest is None or result['requests'][id]['tlsEnd'] > latest):
          latest = result['requests'][id]['tlsEnd']
      if earliest is not None:
        result['pageData']['start'] = earliest
      if latest is not None:
        result['pageData']['fullyLoaded'] = latest

    return result