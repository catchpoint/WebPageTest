<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;
use WebPageTest\ValidatorPatterns;

final class ValidatorPatternsTest extends TestCase
{
  public function testContactInfoDoesNotAllowEmptyString () : void
  {
    $str = "";
    $this->assertEquals(0, preg_match('/' . ValidatorPatterns::getContactInfo() . '/', $str));
  }

  public function testContactInfoAllowsAcceptableString1 () : void
  {
    $str = "Grace Hopper";
    $this->assertEquals(1, preg_match('/' . ValidatorPatterns::getContactInfo() . '/', $str));
  }

  public function testContactInfoAllowsAcceptableString2 () : void
  {
    $str = "Catchpoint, Inc.";
    $this->assertEquals(1, preg_match('/' . ValidatorPatterns::getContactInfo() . '/', $str));
  }

  public function testContactInfoAllowsAcceptableString3 () : void
  {
    $str = "Catchpoint & WPT 4 ever.";
    $this->assertEquals(1, preg_match('/' . ValidatorPatterns::getContactInfo() . '/', $str));
  }

  public function testContactInfoAllowsAcceptableString4 () : void
  {
    $str = "Catchpoint #& WPT 4 ever.";
    $this->assertEquals(1, preg_match('/' . ValidatorPatterns::getContactInfo() . '/', $str));
  }

  public function testContactInfoDoesNotAllowLeftAngleBracket () : void
  {
    $str = "C<atchpoint & WPT 4 ever.";
    $this->assertEquals(0, preg_match('/' . ValidatorPatterns::getContactInfo() . '/', $str));
  }

  public function testContactInfoDoesNotAllowLeftAngleBracket2 () : void
  {
    $str = "<";
    $this->assertEquals(0, preg_match('/' . ValidatorPatterns::getContactInfo() . '/', $str));
  }

  public function testContactInfoDoesNotAllowRightAngleBracket () : void
  {
    $str = "C>atchpoint & WPT 4 ever.";
    $this->assertEquals(0, preg_match('/' . ValidatorPatterns::getContactInfo() . '/', $str));
  }

  public function testContactInfoDoesNotAllowRightAngleBracket2 () : void
  {
    $str = ">";
    $this->assertEquals(0, preg_match('/' . ValidatorPatterns::getContactInfo() . '/', $str));
  }

  public function testContactInfoDoesNotAllowAdjacentAmpersandThenPound () : void
  {
    $str = "Catchpoint &# WPT 4 ever.";
    $this->assertEquals(0, preg_match('/' . ValidatorPatterns::getContactInfo() . '/', $str));
  }

  public function testContactInfoDoesNotAllowAdjacentAmpersandThenPound2 () : void
  {
    $str = "&#";
    $this->assertEquals(0, preg_match('/' . ValidatorPatterns::getContactInfo() . '/', $str));
  }

  public function testNoAngleBracketsDoesNotAllowAngleBrackets1 () : void
  {
    $str = "<";
    $this->assertEquals(0, preg_match('/' . ValidatorPatterns::getNoAngleBrackets() . '/', $str));
  }

  public function testNoAngleBracketsDoesNotAllowAngleBrackets2 () : void
  {
    $str = ">";
    $this->assertEquals(0, preg_match('/' . ValidatorPatterns::getNoAngleBrackets() . '/', $str));
  }

  public function testNoAngleBracketsDoesNotAllowAngleBrackets3 () : void
  {
    $str = "<>";
    $this->assertEquals(0, preg_match('/' . ValidatorPatterns::getNoAngleBrackets() . '/', $str));
  }

  public function testNoAngleBracketsDoesNotAllowAngleBrackets4 () : void
  {
    $str = "><";
    $this->assertEquals(0, preg_match('/' . ValidatorPatterns::getNoAngleBrackets() . '/', $str));
  }

  public function testNoAngleBracketsDoesNotAllowAngleBrackets5 () : void
  {
    $str = "<script>";
    $this->assertEquals(0, preg_match('/' . ValidatorPatterns::getNoAngleBrackets() . '/', $str));
  }

  public function testNoAngleBracketsDoesNotAllowAngleBrackets6 () : void
  {
    $str = "<script/>";
    $this->assertEquals(0, preg_match('/' . ValidatorPatterns::getNoAngleBrackets() . '/', $str));
  }

  public function testNoAngleBracketsDoesNotAllowAngleBrackets7 () : void
  {
    $str = "/<script>alert('hello')<\/script>/";
    $this->assertEquals(0, preg_match('/' . ValidatorPatterns::getNoAngleBrackets() . '/', $str));
  }

  public function testNoAngleBracketsDoesNotAllowAngleBrackets8 () : void
  {
    $str = "/<script>alert('hello')<\/script>/";
    $this->assertEquals(0, preg_match('/' . ValidatorPatterns::getNoAngleBrackets() . '/', $str));
  }

  public function testPasswordNoLowercase () : void
  {
    $str = "/ABCDEFGH1!/";
    $this->assertEquals(0, preg_match('/' . ValidatorPatterns::getPassword() . '/', $str));
  }

  public function testPasswordNoUppercase () : void
  {
    $str = "/abcdefgh1!/";
    $this->assertEquals(0, preg_match('/' . ValidatorPatterns::getPassword() . '/', $str));
  }

  public function testPasswordNoSymbol () : void
  {
    $str = "abcdefgh1";
    $this->assertEquals(0, preg_match('/' . ValidatorPatterns::getPassword() . '/', $str));
  }

  public function testPasswordWithSymbolUnderscore () : void
  {
    $str = "ABCdefgh1_";
    $this->assertEquals(1, preg_match('/' . ValidatorPatterns::getPassword() . '/', $str));
  }

  public function testPasswordWithSymbol () : void
  {
    $str = "ABCdefgh1$";
    $this->assertEquals(1, preg_match('/' . ValidatorPatterns::getPassword() . '/', $str));
  }

  public function testPasswordWithSpaces () : void
  {
    $str = "ABCd efgh1!";
    $this->assertEquals(0, preg_match('/' . ValidatorPatterns::getPassword() . '/', $str));
  }

  public function testPasswordWithAngleBracket1 () : void
  {
    $str = "ABCd<efgh1!";
    $this->assertEquals(0, preg_match('/' . ValidatorPatterns::getPassword() . '/', $str));
  }

  public function testPasswordWithAngleBracket2 () : void
  {
    $str = "ABCd>efgh1!";
    $this->assertEquals(0, preg_match('/' . ValidatorPatterns::getPassword() . '/', $str));
  }

  public function testPasswordWithAngleBracket3 () : void
  {
    $str = "ABCd<efgh>1!";
    $this->assertEquals(0, preg_match('/' . ValidatorPatterns::getPassword() . '/', $str));
  }

  public function testPasswordWithAngleBracket4 () : void
  {
    $str = ">ABCdefgh<1!";
    $this->assertEquals(0, preg_match('/' . ValidatorPatterns::getPassword() . '/', $str));
  }

  public function testPasswordGenerated1 () : void
  {
    $str = "*ss8s69ga@Q*ck2@Y.6oQ!g_TeRiu3";
    $this->assertEquals(1, preg_match('/' . ValidatorPatterns::getPassword() . '/', $str));
  }

  public function testPasswordGenerated2 () : void
  {
    $str = "DWZmndoBn.2Rwws8QukfcMKEsewYRk";
    $this->assertEquals(1, preg_match('/' . ValidatorPatterns::getPassword() . '/', $str));
  }

  public function testPasswordGenerated3 () : void
  {
    $str = "@iGr4immE3v.o3.yR6r3UV2xWVYiG4";
    $this->assertEquals(1, preg_match('/' . ValidatorPatterns::getPassword() . '/', $str));
  }
}
