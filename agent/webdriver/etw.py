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
import gzip
import json
import os
import subprocess
import urlparse

class ETW:
  def __init__(self):
    self.earliest_navigate = None
    self.start = None
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
                            #'Schannel',
                            #'Microsoft-Windows-TCPIP',
                            ]

    # The list of events we actually care about
    self.keep_events = [# Page Navigation Events
                        'Microsoft-IE/Mshtml_CWindow_SuperNavigate2/Start',
                        'Microsoft-IE/Mshtml_BFCache/Info',
                        'Microsoft-IE/Mshtml_WebOCEvents_BeforeNavigate/Info',
                        'Microsoft-IE/Mshtml_CDoc_Navigation/Info', # Start of navigation, keep track of CMarkup* and EventContextId
                        'Microsoft-IE/Mshtml_WebOCEvents_DOMContentLoaded/Info', # CMarkup *
                        'Microsoft-IE/Mshtml_WebOCEvents_DocumentComplete/Info', # CMarkup*
                        'Microsoft-IE/Mshtml_WebOCEvents_NavigateComplete/Info', # CMarkup*
                        'Microsoft-IE/Mshtml_CMarkup_LoadEvent_Start/Start', # EventContextId
                        'Microsoft-IE/Mshtml_CMarkup_LoadEvent_Stop/Stop', # EventContextId
                        'Microsoft-IE/Mshtml_CMarkup_DOMContentLoadedEvent_Start/Start', # EventContextId
                        'Microsoft-IE/Mshtml_CMarkup_DOMContentLoadedEvent_Stop/Stop',  # EventContextId

                        # DNS - linked by etw:ActivityId
                        'Microsoft-Windows-WinINet/WININET_DNS_QUERY/Start',
                        'Microsoft-Windows-WinINet/WININET_DNS_QUERY/Stop',   # Lookup complete (includes address list)
                        'Microsoft-Windows-WinINet/Wininet_Getaddrinfo/Start', # Start of actual lookup
                        'Microsoft-Windows-WinINet/Wininet_Getaddrinfo/Stop',  # End of actual lookup

                        # Socket Connect - linked by etw:ActivityId to DNS
                        'Microsoft-Windows-WinINet/Wininet_SocketConnect/Start',    # Start of connection attempt, includes request #
                        'Microsoft-Windows-WinINet/Wininet_SocketConnect/Stop',     # End of connection attempt
                        'Microsoft-Windows-WinINet/WININET_TCP_CONNECTION/Start',  # Start of connection lifetime (after connected)
                        'Microsoft-Windows-WinINet/WININET_TCP_CONNECTION/Stop',   # End of connection lifetime (closed)
                        'Microsoft-Windows-WinINet/WININET_TCP_CONNECTION/Fail',
                        'Microsoft-Windows-WinINet/Wininet_Connect/Stop',

                        # TLS
                        'Microsoft-Windows-WinINet/WININET_HTTPS_NEGOTIATION/Start',
                        'Microsoft-Windows-WinINet/WININET_HTTPS_NEGOTIATION/Stop',

                        # Requests - linked by etw:ActivityId
                        'Microsoft-Windows-WinINet/WININET_REQUEST_HEADER/Info',   # Headers and size of outbound request - Length, Headers
                        'Microsoft-Windows-WinINet/WININET_RESPONSE_HEADER/Info',  # Headers and size of headers - Length, Headers
                        'Microsoft-Windows-WinINet/Wininet_SendRequest/Start',      # Request created (not necessarily sent) - AddressName (URL)
                        'Microsoft-Windows-WinINet/Wininet_SendRequest/Stop',       # Headers done - Direction changing for capture (no params)
                        'Microsoft-Windows-WinINet/Wininet_SendRequest_Main/Info',  # size of outbound request (and actual start) - Size
                        'Microsoft-Windows-WinINet/Wininet_ReadData/Info',          # inbound bytes (ttfb, keep incrementing end) - Size
                        'Microsoft-Windows-WinINet/Wininet_UsageLogRequest/Info',   # completely finished - URL, Verb, RequestHeaders, ResponseHeaders, Status, UsageLogRequestCache
                        'Microsoft-Windows-WinINet/Wininet_LookupConnection/Stop',  # Maps request to source port of connection "Socket" == local port
                        'Microsoft-Windows-WinINet/WININET_STREAM_DATA_INDICATED/Info', # Size
                        'Microsoft-Windows-WinINet-Capture//',                      # raw bytes (before encryption?_) and length - PayloadByteLength, Payload
                        ]

  def Start(self, log_file):
    ret = 0
    if os.path.exists(log_file):
      os.unlink(log_file)
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

  def Write(self, test_info, dom_data):
    start_offset = 0
    page_data_file = test_info.GetFilePageData()
    request_data_file = test_info.GetFileRequests()
    if self.log_file is not None and self.started and page_data_file is not None and request_data_file is not None:
      csv_file = self.log_file + '.csv'
      self.ExtractCsv(csv_file)
      if os.path.exists(csv_file):
        print('Parsing Events')
        events = self.Parse(csv_file)
        if len(events):
          print('Processing Events')
          raw_result = self.ProcessEvents(events)
          page_data, requests = self.ProcessResult(raw_result, test_info, dom_data)
          with gzip.open(page_data_file + '.gz', 'wb') as f:
            json.dump(page_data, f)
          with gzip.open(request_data_file + '.gz', 'wb') as f:
            json.dump(requests, f)
        os.unlink(csv_file)
    if self.earliest_navigate is not None and self.start is not None and self.start > self.earliest_navigate:
      start_offset = int(round(float(self.start - self.earliest_navigate) / 1000.0))
    return start_offset

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
        try:
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
                event_name = columns[0].replace(' ', '').replace('/win:', '/').replace('/Task.', '/')
                if len(event_name):
                  column_names[event_name] = columns
          else:
            buffer += line
            # line feeds in the data are escaped.  All real data lines end with \r\n
            if len(buffer) and line[-1] != "\r" and buffer[-3:] != "\r\r\n":
              buffer = buffer.replace("\r\r\n", "\r\n")
              # pull the event name from the front of the string so we only do the heavy csv processing for events we care about
              comma = buffer.find(',')
              if comma > 0:
                event_name = buffer[:comma].replace(' ', '').replace('/win:', '/').replace('/Task.', '/')
                if len(event_name) and event_name in column_names and event_name in self.keep_events:
                  columns = self.ExtractCsvLine(buffer)
                  if len(columns):
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
        except:
          pass

    # sort the events by timestamp to make sure we process them in order
    if len(events):
      events.sort(key=lambda event: event['ts'])

    return events

  def ExtractCsvLine(self, csv):
    columns = []
    try:
      buffer = ''
      in_quote = False
      in_multiline_quote = False
      if csv[-2:] == "\r\n":
        csv = csv[:-2]
      length = len(csv)
      for i in xrange(0, length):
        if csv[i] == ',' and not in_quote:
          buffer = buffer.strip(" \r\n")
          if len(buffer) > 1 and buffer[0] == '"' and buffer[-1] == '"':
            buffer = buffer[1:-1]
          columns.append(buffer)
          buffer = ''
        elif len(buffer) or csv[i] != ' ':
          buffer += csv[i]
          # quote escaping starts with a quote as the first non-space character of the field
          if not in_quote and buffer == '"':
            in_quote = True
            in_multiline_quote = False
          elif in_quote and not in_multiline_quote:
            if csv[i] == '"':
              in_quote = False
            elif csv[i] == '\r':
              in_multiline_quote = True
          elif in_quote and in_multiline_quote and csv[i] == '"':
            if len(buffer) > 2 and (csv[i-1] == "\r" or csv[i-1] == "\n"):
              in_quote = False
              in_multiline_quote = False
      if len(buffer):
        buffer = buffer.strip(" \r\n")
        if len(buffer) > 1 and buffer[0] == '"' and buffer[-1] == '"':
          buffer = buffer[1:-1]
        columns.append(buffer)
    except:
      pass
    return columns

  def ProcessEvents(self, events):
    result = {'pageData': {},
              'requests': {},
              'dns': {},
              'sockets': {}}
    dns = {}
    sockets = {}
    requests = {}
    pageContexts = []
    CMarkup = []
    navigating = True
    for event in events:
      try:
        if 'activity' in event:
          id = event['activity']
          if event['name'] == 'Microsoft-IE/Mshtml_CWindow_SuperNavigate2/Start':
            navigating = True
          if self.earliest_navigate is None and\
              (event['name'] == 'Microsoft-IE/Mshtml_CWindow_SuperNavigate2/Start' or
               event['name'] == 'Microsoft-IE/Mshtml_BFCache/Info' or
               event['name'] == 'Microsoft-IE/Mshtml_WebOCEvents_BeforeNavigate/Info' or
               event['name'] == 'Microsoft-IE/Mshtml_CDoc_Navigation/Info'):
            self.earliest_navigate = event['ts']
          if navigating and event['name'] == 'Microsoft-IE/Mshtml_CDoc_Navigation/Info':
            if 'EventContextId' in event['fields'] and 'CMarkup*' in event['fields']:
              pageContexts.append(event['fields']['EventContextId'])
              CMarkup.append(event['fields']['CMarkup*'])
              navigating = False
              if 'start' not in result:
                result['start'] = event['ts']
              if 'URL' in event['fields'] and 'URL' not in result:
                result['URL'] = event['fields']['URL']
          elif 'start' in result:
            # Page Navigation events
            if event['name'] == 'Microsoft-IE/Mshtml_WebOCEvents_DocumentComplete/Info':
              if 'CMarkup*' in event['fields'] and event['fields']['CMarkup*'] in CMarkup:
                result['pageData']['load'] = event['ts']
            if event['name'] == 'Microsoft-IE/Mshtml_CMarkup_LoadEvent_Start/Start':
              if 'EventContextId' in event['fields'] and event['fields']['EventContextId'] in pageContexts:
                result['pageData']['loadEventStart'] = event['ts']
            if event['name'] == 'Microsoft-IE/Mshtml_CMarkup_LoadEvent_Stop/Stop':
              if 'EventContextId' in event['fields'] and event['fields']['EventContextId'] in pageContexts:
                result['pageData']['loadEventEnd'] = event['ts']
            if event['name'] == 'Microsoft-IE/Mshtml_CMarkup_DOMContentLoadedEvent_Start/Start':
              if 'EventContextId' in event['fields'] and event['fields']['EventContextId'] in pageContexts:
                result['pageData']['domContentLoadedEventStart'] = event['ts']
            if event['name'] == 'Microsoft-IE/Mshtml_CMarkup_DOMContentLoadedEvent_Stop/Stop':
              if 'EventContextId' in event['fields'] and event['fields']['EventContextId'] in pageContexts:
                result['pageData']['domContentLoadedEventEnd'] = event['ts']

            # DNS
            if event['name'] == 'Microsoft-Windows-WinINet/WININET_DNS_QUERY/Start' and id not in dns:
              if 'HostName' in event['fields']:
                dns[id] = {'host': event['fields']['HostName']}
            if event['name'] == 'Microsoft-Windows-WinINet/WININET_DNS_QUERY/Stop' and id in dns:
              if 'AddressList' in event['fields']:
                dns[id]['addresses'] = list(filter(None, event['fields']['AddressList'].split(';')))
            if event['name'] == 'Microsoft-Windows-WinINet/Wininet_Getaddrinfo/Start' and id in dns:
              dns[id]['start'] = event['ts']
            if event['name'] == 'Microsoft-Windows-WinINet/Wininet_Getaddrinfo/Stop' and id in dns:
              dns[id]['end'] = event['ts']

            # Sockets
            if event['name'] == 'Microsoft-Windows-WinINet/Wininet_SocketConnect/Start' and id not in result['sockets']:
              result['sockets'][id] = {'start': event['ts'], 'index': len(result['sockets'])}
              if 'Socket' in event['fields']:
                result['sockets'][id]['socket'] = event['fields']['Socket']
              if 'SourcePort' in event['fields']:
                sockets[event['fields']['SourcePort']] = id # keep a mapping from the source port to the connection activity id
                result['sockets'][id]['srcPort'] = event['fields']['SourcePort']
              if 'RemoteAddressIndex' in event['fields']:
                result['sockets'][id]['addrIndex'] = event['fields']['RemoteAddressIndex']
            if event['name'] == 'Microsoft-Windows-WinINet/Wininet_SocketConnect/Stop' and id in result['sockets']:
              result['sockets'][id]['end'] = event['ts']
            if event['name'] == 'Microsoft-Windows-WinINet/WININET_TCP_CONNECTION/Start' and id in result['sockets']:
              if 'ServerName' in event['fields']:
                result['sockets'][id]['host'] = event['fields']['ServerName']
            if event['name'] == 'Microsoft-Windows-WinINet/WININET_TCP_CONNECTION/Stop' and id in result['sockets']:
              if 'end' not in result['sockets'][id]:
                result['sockets'][id]['end'] = event['ts']
              if 'srcPort' in result['sockets'][id] and result['sockets'][id]['srcPort'] in sockets:
                del sockets[result['sockets'][id]['srcPort']]
            if event['name'] == 'Microsoft-Windows-WinINet/WININET_TCP_CONNECTION/Fail' and id in result['sockets']:
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
            if event['name'] == 'Microsoft-Windows-WinINet/WININET_HTTPS_NEGOTIATION/Start' and id in result['sockets']:
              result['sockets'][id]['tlsStart' ] = event['ts']
            if event['name'] == 'Microsoft-Windows-WinINet/WININET_HTTPS_NEGOTIATION/Stop' and id in result['sockets']:
              result['sockets'][id]['tlsEnd' ] = event['ts']

            # Requests
            if event['name'] == 'Microsoft-Windows-WinINet/Wininet_SendRequest/Start':     # Request created (not necessarily sent) - AddressName (URL)
              if id not in requests:
                requests[id] = {}
              if 'AddressName' in event['fields'] and 'URL' not in requests[id]:
                requests[id]['URL'] = event['fields']['AddressName']
            if event['name'] == 'Microsoft-Windows-WinINet/WININET_REQUEST_HEADER/Info':  # Headers and size of outbound request - Length, Headers
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

            if event['name'] == 'Microsoft-Windows-WinINet/WININET_RESPONSE_HEADER/Info' and id in requests: # Headers and size of headers - Length, Headers
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
            if event['name'] == 'Microsoft-Windows-WinINet/WININET_STREAM_DATA_INDICATED/Info' and id in requests:  # Size
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
      except:
        pass

    # only report the DNS lookups that actually went on the wire
    try:
      for id in dns:
        if 'start' in dns[id]:
          result['dns'][id] = dns[id]
    except:
      pass

    # Fill in the host and address for any sockets that had a DNS entry (even if the DNS did not require a lookup)
    try:
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
    except:
      pass

    # Only keep track of the requests that were actually sent
    try:
      for id in requests:
        if 'start' in requests[id]:
          result['requests'][id] = requests[id]
    except:
      pass

    # Copy over the connect and dns timings to the first request on a given socket.
    for id in result['sockets']:
      try:
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
      except:
        pass

    # Calculate some page timings and adjust the start time to the start of actual activity
    if len(result['requests']):
      earliest = None
      latest = None
      if 'load' in result['pageData']:
        latest = result['pageData']['load']
      result['pageData']['inBytes'] = 0
      result['pageData']['outBytes'] = 0
      for id in result['requests']:
        try:
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
        except:
          pass
      if earliest is not None:
        result['pageData']['start'] = earliest
      if latest is not None:
        result['pageData']['fullyLoaded'] = latest

    return result

  def Elapsed(self, ts):
    elapsed = None
    if self.start is not None:
      elapsed = int(round(float(ts - self.start) / 1000.0))
    return elapsed

  def ParseHeaders(self, str, isInbound):
    h = {'headers':[]}
    lines = str.split("\n")
    row = 0
    for line in lines:
      try:
        line = line.strip()
        if len(line):
          if row == 0:
            parts = line.split(' ')
            if isInbound:
              if len(parts) > 1:
                h['response_code'] = parts[1].strip()
            elif len(parts) > 0:
              h['verb'] = parts[0].strip()
          elif line.find(':') > 0:
            key, value = line.split(':', 1)
            key = key.strip(' :').lower()
            value = value.strip(' :')
            if isInbound:
              if key == 'expires':
                h['expires'] = value
              elif key == 'cache-control':
                h['cache_control'] = value
              elif key == 'content-type':
                h['content_type'] = value
              elif key == 'content-encoding':
                h['content_encoding'] = value
          h['headers'].append(line)
          row += 1
      except:
        pass
    return h

  def ProcessResult(self, raw, test_info, dom_data):
    page_data = {'browser_name': 'Microsoft Edge',
                 'responses_200': 0,
                 'responses_404': 0,
                 'responses_other': 0,
                 'result': 99998,
                 'bytesOutDoc': 0,
                 'bytesInDoc': 0,
                 'bytesOut': 0,
                 'bytesIn': 0,
                 'requests': 0,
                 'requestsDoc': 0}
    requests = []
    if 'start' in raw['pageData']:
      self.start = raw['pageData']['start']

      # Loop through all of the requests first
      # All times are in microseconds so we divide by 1000 to get ms
      for id in raw['requests']:
        try:
          r = raw['requests'][id]
          request = {}
          if 'URL' in r:
            request['full_url'] = r['URL'];
            parts = urlparse.urlsplit(r['URL'])
            if len(parts) > 1:
              request['host'] = parts[1]
            if len(parts) > 2:
              request['url'] = parts[2]
            if len(parts) > 3 and len(parts[3]) > 0:
              request['url'] += '?' + parts[3]
            if parts[0] == 'https':
              request['is_secure'] = 1
            else:
              request['is_secure'] = 0
          if 'verb' in r:
            request['method'] = r['verb']
          if 'protocol' in r:
            request['protocol'] = r['protocol']
          request['request_id'] = id.strip('{}').replace('-', '')
          request['load_start'] = self.Elapsed(r['start'])
          if 'end' in r:
            request['load_ms'] = self.Elapsed(r['end']) - request['load_start']
          if 'firstByte' in r:
            request['ttfb_ms'] = self.Elapsed(r['firstByte']) - request['load_start']
          if 'dnsStart' in r and 'dnsEnd' in r:
            request['dns_start'] = self.Elapsed(r['dnsStart'])
            request['dns_end'] = self.Elapsed(r['dnsEnd'])
            request['dns_ms'] = request['dns_end'] - request['dns_start']
          if 'connectStart' in r and 'connectEnd' in r:
            request['connect_start'] = self.Elapsed(r['connectStart'])
            request['connect_end'] = self.Elapsed(r['connectEnd'])
            request['connect_ms'] = request['connect_end'] - request['connect_start']
          if 'tlsStart' in r and 'tlsEnd' in r:
            request['ssl_start'] = self.Elapsed(r['tlsStart'])
            request['ssl_end'] = self.Elapsed(r['tlsEnd'])
            request['ssl_ms'] = request['ssl_end'] - request['ssl_start']

          if 'inBytes' in r:
            request['bytesIn'] = r['inBytes']
            if 'inHeadersLen' in r:
              request['objectSize'] = r['inBytes'] - r['inHeadersLen']
          if 'outBytes' in r:
            request['bytesOut'] = r['outBytes']
          if 'connection' in r and r['connection'] in raw['sockets']:
            c = raw['sockets'][r['connection']]
            if 'socket' in c:
              request['socket'] = c['socket']
            else:
              request['socket'] = c['index']
            if 'start' in c and 'end' in c:
              request['server_rtt'] = int(round(float(c['end'] - c['start']) / 1000.0))
            if 'srcPort' in c:
              request['client_port'] = c['srcPort']
            if 'remote' in c:
              ip, port = c['remote'].split(':', 1)
              request['ip_addr'] = ip

          if 'outHeaders' in r:
            h = self.ParseHeaders(r['outHeaders'], False)
            request['headers'] = {}
            if 'headers' in h:
              request['headers']['request'] = h['headers']
            if 'verb' in h:
              request['method'] = h['verb']

          if 'inHeaders' in r:
            h = self.ParseHeaders(r['inHeaders'], True)
            if 'headers' not in request:
              request['headers'] = {}
            if 'headers' in h:
              request['headers']['response'] = h['headers']
            if 'expires' in h:
              request['expires'] = h['expires']
            if 'cache_control' in h:
              request['cacheControl'] = h['cache_control']
            if 'content_type' in h:
              request['contentType'] = h['content_type']
            if 'content_encoding' in h:
              request['contentEncoding'] = h['content_encoding']
            if 'response_code' in h:
              request['responseCode'] = h['response_code']

          requests.append(request)
        except:
          pass

      # Sort all of the requests by start time
      if len(requests):
        requests.sort(key=lambda request: request['load_start'])

      # Collect the basic page stats
      try:
        page_data['URL'] = test_info.GetUrl()
        if 'URL' in raw and page_data['URL'] is None:
          page_data['URL'] = raw['URL']
        if 'loadEventStart' in raw['pageData']:
          page_data['result'] = 0
          page_data['loadTime'] = self.Elapsed(raw['pageData']['loadEventStart'])
          page_data['docTime'] = page_data['loadTime']
          if 'loadEventEnd' in raw['pageData']:
            page_data['loadEventStart'] = self.Elapsed(raw['pageData']['loadEventStart'])
            page_data['loadEventEnd'] = self.Elapsed(raw['pageData']['loadEventEnd'])
        if 'domContentLoadedEventStart' in raw['pageData']:
          page_data['domContentLoadedEventStart'] = self.Elapsed(raw['pageData']['domContentLoadedEventStart'])
          if 'domContentLoadedEventEnd' in raw['pageData']:
            page_data['domContentLoadedEventEnd'] = self.Elapsed(raw['pageData']['domContentLoadedEventEnd'])
          else:
            page_data['domContentLoadedEventEnd'] = page_data['domContentLoadedEventStart']
        if 'load' in raw['pageData']:
          page_data['result'] = 0
          page_data['loadTime'] = self.Elapsed(raw['pageData']['load'])
          page_data['docTime'] = page_data['loadTime']
        if 'fullyLoaded' in raw['pageData']:
          page_data['fullyLoaded'] = self.Elapsed(raw['pageData']['fullyLoaded'])
        if test_info.IsCached():
          page_data['cached'] = 1
        else:
          page_data['cached'] = 0
      except:
        pass

      # Loop through all of the requests
      connections = {}
      page_data['requestsFull'] = len(requests)
      first_200 = True
      if len(requests):
        for r in requests:
          try:
            if 'socket' in r:
              connections[r['socket']] = r['socket']
            if 'bytesIn' in r:
              page_data['bytesIn'] += r['bytesIn']
            if 'bytesOut' in r:
              page_data['bytesOut'] += r['bytesOut']
            if 'url' in r and r['url'].find('favicon.ico') == -1:
              page_data['requests'] += 1
              if 'responseCode' in r:
                code = int(r['responseCode'])
                if first_200 and (code == 304 or (code >= 200 and code < 300)):
                  first_200 = False
                  if 'ttfb_ms' in r and 'load_start' in r:
                    page_data['TTFB'] = r['load_start'] + r['ttfb_ms']
                  if 'server_rtt' in r:
                    page_data['server_rtt'] = r['server_rtt']
                if code == 200:
                  page_data['responses_200'] += 1
                elif code == 404:
                  page_data['responses_404'] += 1
                  if page_data['result'] == 0:
                    page_data['result'] = 99999
                else:
                  page_data['responses_other'] += 1
              if  'docTime' in page_data and r['load_start'] <= page_data['docTime']:
                page_data['requestsDoc'] += 1
                if 'bytesIn' in r:
                  page_data['bytesInDoc'] += r['bytesIn']
                if 'bytesOut' in r:
                  page_data['bytesOutDoc'] += r['bytesOut']
          except:
            pass
      page_data['connections'] = len(connections)

    # merge any passed-in data that was pulled from the DOM
    if dom_data is not None:
      for key in dom_data:
        page_data[key] = dom_data[key]

    return page_data, requests