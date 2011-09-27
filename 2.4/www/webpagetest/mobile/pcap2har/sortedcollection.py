'''
This class originates from http://code.activestate.com/recipes/577197-sortedcollection/

It is distributed under the MIT license. Copyright Raymond Hettinger 16 April 2010
'''


from bisect import bisect_left, bisect_right

class SortedCollection(object):
    '''Encapsulates a sequence sorted by a given key function.

    SortedCollection() is much easier to work with than using bisect() directly.

    The key function is automatically applied to each search.  The results
    are cached so that the key function is called exactly once for each item.

    Instead of returning a difficult to interpret insertion-point, the three
    find-methods return a specific item in the sequence. They can scan for exact
    matches, the largest item less-than-or-equal to a key, or the smallest item
    greater-than-or-equal to a key.

    Once found, an item's ordinal position can be found with the index() method.

    New items can be added with the insert() and insert_right() methods.

    The usual sequence methods are provided to support indexing, slicing, length
    lookup, clearing, forward and reverse iteration, contains checking, and a
    nice repr.

    Finding and indexing are all O(log n) operations while iteration and
    insertion are O(n).  The initial sort is O(n log n).

    The key function is stored in the 'key' attibute for easy introspection or
    so that you can assign a new key function (triggering an automatic re-sort).

    In short, the class was designed to handle all of the common use cases for
    bisect, but with a simpler API and with automatic support for key functions.

    >>> from pprint import pprint
    >>> from operator import itemgetter

    >>> s = SortedCollection(key=itemgetter(2))
    >>> for record in [
    ...         ('roger', 'young', 30),
    ...         ('bill', 'smith', 22),
    ...         ('angela', 'jones', 28),
    ...         ('david', 'thomas', 32)]:
    ...     s.insert(record)

    >>> pprint(list(s))         # show records sorted by age
    [('bill', 'smith', 22),
     ('angela', 'jones', 28),
     ('roger', 'young', 30),
     ('david', 'thomas', 32)]

    >>> s.find_le(29)           # find oldest person aged 29 or younger
    ('angela', 'jones', 28)

    >>> r = s.find_ge(31)       # find first person aged 31 or older
    >>> s.index(r)              # get the index of their record
    3
    >>> s[3]                    # fetch the record at that index
    ('david', 'thomas', 32)

    >>> s.key = itemgetter(0)   # now sort by first name
    >>> pprint(list(s))
    [('angela', 'jones', 28),
     ('bill', 'smith', 22),
     ('david', 'thomas', 32),
     ('roger', 'young', 30)]

    '''

    def __init__(self, iterable=(), key=None):
        self._key = (lambda x: x) if key is None else key
        self._items = sorted(iterable, key=self._key)
        self._keys = list(map(self._key, self._items))

    def _getkey(self):
        return self._key

    def _setkey(self, key):
        if key is not self._key:
            self.__init__(self._items, key=key)

    def _delkey(self):
        self._setkey(None)

    key = property(_getkey, _setkey, _delkey, 'key function')

    def clear(self):
        self.__init__([], self._key)

    def __len__(self):
        return len(self._items)

    def __getitem__(self, i):
        return self._items[i]

    def __contains__(self, key):
        return key in self._items
        i = bisect_left(self._keys, key)
        return self._keys[i] == key

    def __iter__(self):
        return iter(self._items)

    def __reversed__(self):
        return reversed(self._items)

    def __repr__(self):
        return '%s(%r, key=%s)' % (
            self.__class__.__name__,
            self._items,
            getattr(self._key, '__name__', repr(self._key))
        )

    def index(self, item):
        '''Find the position of an item.  Raise a ValueError if not found'''
        key = self._key(item)
        i = bisect_left(self._keys, key)
        n = len(self)
        while i < n and self._keys[i] == key:
            if self._items[i] == item:
                return i
            i += 1
        raise ValueError('No item found with key equal to: %r' % (key,))   

    def insert(self, item):
        'Insert a new item.  If equal keys are found, add to the left'
        key = self._key(item)
        i = bisect_left(self._keys, key)
        self._keys.insert(i, key)
        self._items.insert(i, item)

    def insert_right(self, item):
        'Insert a new item.  If equal keys are found, add to the right'
        key = self._key(item)
        i = bisect_right(self._keys, key)
        self._keys.insert(i, key)
        self._items.insert(i, item)

    def find(self, key):
        '''Find item with a key-value equal to key.
        Raise ValueError if no such item exists.

        '''
        i = bisect_left(self._keys, key)
        if self._keys[i] == key:
            return self._items[i]
        raise ValueError('No item found with key equal to: %r' % (key,))

    def find_le(self, key):
        '''Find item with a key-value less-than or equal to key.
        Raise ValueError if no such item exists.
        If multiple key-values are equal, return the leftmost.

        '''
        i = bisect_left(self._keys, key)
        if i == len(self._keys):
            return self._items[-1]
        if self._keys[i] == key:
            return self._items[i]
        if i == 0:
            raise ValueError('No item found with key at or below: %r' % (key,))
        return self._items[i-1]

    def find_ge(self, key):
        '''Find item with a key-value greater-than or equal to key.
        Raise ValueError if no such item exists.
        If multiple key-values are equal, return the rightmost.

        '''
        i = bisect_right(self._keys, key)
        if i == 0:
            raise ValueError('No item found with key at or above: %r' % (key,))
        if self._keys[i-1] == key:
            return self._items[i-1]
        try:
            return self._items[i]
        except IndexError:
            raise ValueError('No item found with key at or above: %r' % (key,))
             

if __name__ == '__main__':
    sd = SortedCollection('The quick Brown Fox jumped'.split(), key=str.lower)
    print(sd._keys)
    print(sd._items)
    print(sd._key)
    print(repr(sd))
    print(sd.key)
    sd.key = str.upper
    print(sd.key)
    print(len(sd))
    print(list(sd))
    print(list(reversed(sd)))
    for item in sd:
        assert item in sd
    for i, item in enumerate(sd):
        assert item == sd[i]
    sd.insert('jUmPeD')
    sd.insert_right('QuIcK')
    print(sd._keys)
    print(sd._items)
    print(sd.find_le('JUMPED'), 'jUmPeD')
    print(sd.find_ge('JUMPED'), 'jumped')
    print(sd.find_le('GOAT'), 'Fox')
    print(sd.find_ge('GOAT'), 'jUmPeD')
    print(sd.find('FOX'))
    print(sd[3])
    print(sd[3:5])
    print(sd[-2])
    print(sd[-4:-2])
    for i, item in enumerate(sd):
        print(sd.index(item), i)
    try:
        sd.index('xyzpdq')
    except ValueError:
        pass
    else:
        print('Oops, failed to notify of missing value')
    

    import doctest
    print(doctest.testmod())
