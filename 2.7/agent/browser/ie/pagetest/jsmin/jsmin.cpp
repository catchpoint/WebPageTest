/* jsmin.cpp
   2007-05-22

Copyright (c) 2002 Douglas Crockford  (www.crockford.com)

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
of the Software, and to permit persons to whom the Software is furnished to do
so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

The Software shall be used for Good, not Evil.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

This has been modified from the original version in that it has been wrapped with a class
so multiple instances can co-exist and it now works on memory buffers sndstead of stdin
*/

#include <stdlib.h>
#include <stdio.h>
#include "JSMin.h"

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
JSMin::JSMin()
{
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
JSMin::~JSMin()
{
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool JSMin::Minify(const char * inBuff, char * outBuff, unsigned long &outBuffLen)
{
	ret = false;
	__try
	{
	  theLookahead = EOF;

	  in = inBuff;
	  out = outBuff;
	  outLen = outBuffLen;
	  len = 0;
  	
	  Run();
  	
	  outBuffLen = len;
    ret = true;
	}__except(1)
	{
	}
	
	return ret;
}

/*-----------------------------------------------------------------------------
 isAlphanum -- return true if the character is a letter, digit, underscore,
        dollar sign, or non-ASCII character.
-----------------------------------------------------------------------------*/
int JSMin::isAlphanum(int c)
{
    return ((c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') ||
        (c >= 'A' && c <= 'Z') || c == '_' || c == '$' || c == '\\' ||
        c > 126);
}

/*-----------------------------------------------------------------------------
put -- put the character into the output buffer
-----------------------------------------------------------------------------*/
void JSMin::put(int c)
{
	if( len < outLen )
	{
		*out = c;
		out++;
		len++;
	}
	else
		ret = false;
}

/*-----------------------------------------------------------------------------
 get -- return the next character from stdin. Watch out for lookahead. If
        the character is a control character, translate it to a space or
        linefeed.
-----------------------------------------------------------------------------*/
int JSMin::get()
{
    int c = theLookahead;
    theLookahead = EOF;
    if (c == EOF) {
        c = *in;
        in++;
        if( !c )
			c = EOF;
    }
    if (c >= ' ' || c == '\n' || c == EOF) {
        return c;
    }
    if (c == '\r') {
        return '\n';
    }
    return ' ';
}

/*-----------------------------------------------------------------------------
 peek -- get the next character without getting it.
-----------------------------------------------------------------------------*/
int JSMin::peek()
{
    theLookahead = get();
    return theLookahead;
}

/*-----------------------------------------------------------------------------
 next -- get the next character, excluding comments. peek() is used to see
        if a '/' is followed by a '/' or '*'.
-----------------------------------------------------------------------------*/
int JSMin::next()
{
    int c = get();
    if  (c == '/') {
        switch (peek()) {
        case '/':
            for (;;) {
                c = get();
                if (c <= '\n') {
                    return c;
                }
            }
        case '*':
            get();
            for (;;) {
                switch (get()) {
                case '*':
                    if (peek() == '/') {
                        get();
                        return ' ';
                    }
                    break;
                case EOF:
					ret = false;
					break;
                }
            }
        default:
            return c;
        }
    }
    return c;
}

/*-----------------------------------------------------------------------------
 action -- do something! What you do is determined by the argument:
        1   Output A. Copy B to A. Get the next B.
        2   Copy B to A. Get the next B. (Delete A).
        3   Get the next B. (Delete B).
   action treats a string as a single character. Wow!
   action recognizes a regular expression if it is preceded by ( or , or =.
-----------------------------------------------------------------------------*/
void JSMin::action(int d)
{
    switch (d) {
    case 1:
        put(theA);
    case 2:
        theA = theB;
        if (theA == '\'' || theA == '"') {
            for (;;) {
                put(theA);
                theA = get();
                if (theA == theB) {
                    break;
                }
                if (theA <= '\n') {
					ret = false;
					break;
                }
                if (theA == '\\') {
                    put(theA);
                    theA = get();
                }
            }
        }
    case 3:
        theB = next();
        if (theB == '/' && (theA == '(' || theA == ',' || theA == '=' ||
                            theA == ':' || theA == '[' || theA == '!' || 
                            theA == '&' || theA == '|' || theA == '?' || 
                            theA == '{' || theA == '}' || theA == ';' || 
                            theA == '\n')) {
            put(theA);
            put(theB);
            for (;;) {
                theA = get();
                if (theA == '/') {
                    break;
                } else if (theA =='\\') {
                    put(theA);
                    theA = get();
                } else if (theA <= '\n') {
					ret = false;
					break;
                }
                put(theA);
            }
            theB = next();
        }
    }
}

/*-----------------------------------------------------------------------------
 jsmin -- Copy the input to the output, deleting the characters which are
        insignificant to JavaScript. Comments will be removed. Tabs will be
        replaced with spaces. Carriage returns will be replaced with linefeeds.
        Most spaces and linefeeds will be removed.
-----------------------------------------------------------------------------*/
void JSMin::Run()
{
    theA = '\n';
    action(3);
    while (ret && theA != EOF) {
        switch (theA) {
        case ' ':
            if (isAlphanum(theB)) {
                action(1);
            } else {
                action(2);
            }
            break;
        case '\n':
            switch (theB) {
            case '{':
            case '[':
            case '(':
            case '+':
            case '-':
                action(1);
                break;
            case ' ':
                action(3);
                break;
            default:
                if (isAlphanum(theB)) {
                    action(1);
                } else {
                    action(2);
                }
            }
            break;
        default:
            switch (theB) {
            case ' ':
                if (isAlphanum(theA)) {
                    action(1);
                    break;
                }
                action(3);
                break;
            case '\n':
                switch (theA) {
                case '}':
                case ']':
                case ')':
                case '+':
                case '-':
                case '"':
                case '\'':
                    action(1);
                    break;
                default:
                    if (isAlphanum(theA)) {
                        action(1);
                    } else {
                        action(3);
                    }
                }
                break;
            default:
                action(1);
                break;
            }
        }
    }
}
