'''
Defines functions for comparing and processing TCP sequence numbers, taking
into account their limited number space.
'''

def twos_comp(x):
    return (~x)+1

numberspace = 2**32 # seq numbers are up to but not including this
halfspace = numberspace / 2

def wrap(x):
    '''
    emulates the cast to int used in the C tcp seq # subtraction algo:
    (int)( (a) - (b) ). Basically, if a number's absolute value is greater
    than half the (unsigned) number space, it needs to be wrapped.
    '''
    # if abs(x) > numberspace / 2, its value must be reduced by numberspace/2,
    # and its sign must be flipped
    if x > halfspace:
        x = 0 - (x - halfspace)
    elif x < -halfspace:
        x = 0 - (x + halfspace)
    # x is now normalized
    return x

def subtract(a, b):
    '''Calculate the difference between a and b, two python longs,
    in a manner suitable for comparing two TCP sequence numbers in a
    wrap-around-sensitive way.'''
    return wrap(a - b)

def lt(a, b):
    return subtract(a, b) < 0

def gt(a, b):
    return subtract(a, b) > 0

def lte(a, b):
    return subtract(a, b) <= 0

def gte(a, b):
    return subtract(a, b) >= 0

import unittest

class TestTcpSeqSubtraction(unittest.TestCase):
    def testNormalSubtraction(self):
        self.assertEqual(subtract(500L, 1L), 499L)
        self.assertEqual(subtract(1L, 1L), 0L)
        self.assertEqual(subtract(0x10000000, 0x20000000), -0x10000000)
        #self.assertEqual(subtract(20L, 0x
    def testWrappedSubtraction(self):
        #self.assertEqual(subtract(0, 0xffffffff), 1)
        # actual: a < b. want: a > b
        self.assertEqual(subtract(0x10000000, 0xd0000000), 0x40000000)
        # actual: a > b. want: a < b
        self.assertEqual(subtract(0xd0000000, 0x10000000), -0x40000000)
        #self.assertEqual(subtract(
        #self.assertEqual(subtract(
        #self.assertEqual(subtract(

class TestLessThan(unittest.TestCase):
    def testLessThan(self):
        self.assertTrue( not lt(100, 10))
        self.assertTrue( lt(0x7fffffff, 0xf0000000))
    
def runtests():
    suite = unittest.TestSuite()
    suite.addTest(TestTcpSeqSubtraction("testNormalSubtraction"))
    suite.addTest(TestTcpSeqSubtraction("testWrappedSubtraction"))
    suite.addTest(TestLessThan("testLessThan"))
    #suite.addTest(TestLessThan(""))
    runner = unittest.TextTestRunner()
    runner.run(suite)
