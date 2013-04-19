"""
functions and classes for generating HAR data from parsed http data
"""
import http
import logging
import simplejson as json


# custom json encoder
class JsonReprEncoder(json.JSONEncoder):
  '''
  Custom Json Encoder that attempts to call json_repr on every object it
  encounters.
  '''
  def default(self, obj):
    if hasattr(obj, 'json_repr'):
      return obj.json_repr()
    return json.JSONEncoder.default(self, obj) # should call super instead?
