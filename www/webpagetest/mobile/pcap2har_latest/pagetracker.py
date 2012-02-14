class Page(object):
    '''
    Members:
    * pageref
    * url = string or None
    * root_document = entry or None 
    * startedDateTime
    * user_agent = string, UA of program requesting page
    * title = url
    * referrers = set([string]), urls that have referred to this page, directly
      or indirectly. If anything refers to them, they also belong on this page
    * last_entry = entry, the last entry to be added 
    '''
    def __init__(self, pageref, entry, is_root_doc=True):
        '''
        Creates new page with passed ref and data from entry
        '''
        # basics
        self.pageref = pageref
        self.referrers = set()
        self.startedDateTime = entry.startedDateTime
        self.last_entry = entry
        self.user_agent = entry.request.msg.headers.get('user-agent')
        # url, title, etc.
        if is_root_doc:
            self.root_document = entry
            self.url = entry.request.url
            self.title = self.url
        else:
            # if this is a hanging referrer
            if 'referer' in entry.request.msg.headers:
                # save it so other entries w/ the same referrer will come here
                self.referrers.add(entry.request.msg.headers['referer'])
            self.url = None # can't guarantee it's the referrer
            self.title = 'unknown title'
    def has_referrer(self, ref):
        '''
        Returns whether the passed ref might be referring to an url in this page
        '''
        return ref == self.url or ref in self.referrers
    def add(self, entry):
        '''
        Adds the entry to the page's data, whether it likes it or not
        '''
        self.last_entry = entry
        self.referrers.add(entry.request.url)
    def json_repr(self):
        return {
            'id': self.pageref,
            'startedDateTime': self.startedDateTime.isoformat() + 'Z',
            'title': self.title,
            'pageTimings': default_page_timings
        }


default_page_timings = {
    'onContentLoad': -1,
    'onLoad': -1
}

def is_root_document(entry):
    '''
    guesses whether the entry is from the root document of a web page
    '''
    # guess based on media type
    mt = entry.response.mediaType
    if mt.type == 'text':
        if mt.subtype in ['html', 'xhtml', 'xml']:
            # probably...
            return True
    return False

class PageTracker(object):
    '''
    Groups http entries into pages.

    Takes a series of http entries and returns string pagerefs. Divides them
    into pages based on http referer headers (and maybe someday by temporal
    locality). Basically all it has to do is sort entries into buckets by any
    means available.
    '''
    def __init__(self):
        self.page_number = 0 # used for generating pageids
        self.pages = [] # [Page]
    def getref(self, entry):
        '''
        takes an Entry and returns a pageref.

        Entries must be passed in by order of arrival
        '''
        # extract interesting information all at once
        req = entry.request # all the interesting stuff is in the request
        referrer = req.msg.headers.get('referer')
        user_agent = req.msg.headers.get('user-agent')
        matched_page = None # page we added the request to
        # look through pages for matches
        for page in self.pages:
            # check user agent
            if page.user_agent and user_agent:
                if page.user_agent != user_agent:
                    continue
            # check referrers
            if referrer and page.has_referrer(referrer):
                matched_page = page
                break
        # if we found a page, return it
        if matched_page:
            matched_page.add(entry)
            return matched_page.pageref
        else:
            # make a new page
            return self.new_ref(entry)
    def new_ref(self, entry):
        '''
        Internal. Wraps creating a new pages entry. Returns the new ref
        '''
        new_page = Page(
            self.new_id(),
            entry,
            is_root_document(entry))
        self.pages.append(new_page)
        return new_page.pageref
    def new_id(self):
        result = 'page_%d' % self.page_number
        self.page_number += 1
        return result
    def json_repr(self):
        return sorted(self.pages)
