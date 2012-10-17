#!/usr/bin/python

class OrderedSet:
    '''
    Loose Python equivalent of std::set. makes sure list is sorted when it is
    accessed (searched, iterated over, etc.), but not until then. Basically,
    sort lazily. Items are also unique.
    '''
    def __init__(self, items=None, **sorting_parameters):
        '''
        Initialize the set with a list of items, or not at all. They will be
        sorted automatically.
        items = list of initial items
        sorting_parameters = keyword arguments which will be passed to sort
        '''
        self.items = sorted(items) if items else []
        self.sorted = False
        self.sorting_parameters = sorting_parameters
    def insert(self, newitem):
        '''
        Insert the new item, if we don't have it already.
        '''
        if not newitem in self.items:
            self.items.append(newitem)
            self.sorted = False # we can't be sure, anyway
    def check_sorting(self):
        '''
        If the list is not sorted, sort it, with the kwargs passed to __init__
        '''
        if not self.sorted:
            self.items.sort(**self.sorting_parameters)
            self.sorted = True

if __name__ == "__main__":
    # test the set
    pass
    