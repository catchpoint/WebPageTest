##################### Login Session 2.2.4 #######################

Login Session is a simple login script.  It supports multiple users, and
can be used to protect web pages from unwanted visitors.  Users, email 
addresses, and passwords are stored and encoded in a flat file.  To 
get started, simply upload one file to your web server and add one line 
of code to your page.  100% Valid XHTML 1.0 Strict coding.

__________________________________________________________________

Licensing:

This script is released under GNU Public Licensing terms.  It is free to 
use, modify, and distribute.

Support is available at http://www.myphpscripts.net

Enjoy!

###############################################################

// Installation Requirements //

- PHP 4+

// Installation Instructions //

1. Edit the variables in the login.php file.

2. Upload the login.php file to your webserver.

3. Paste the following code on the first line of the web page you would like
   to protect:  <?php require("login.php"); ?>

4. If the extension on your webpage is not .php, change the extension to .php.
   Example: Rename homepage.htm to homepage.php

5. Visit the webpage and create your first login.

That should be it.  You now have a password protected webpage.

Options:

To add a logout option to your page use the following code:
<a href="<?php $_SERVER['PHP_SELF']; ?>?ls_logout" rel="">Logout</a>

To display the user's name use the following code:
<?php echo $_SESSION['ls_user']; ?>

To display the user's email address use the following code:
<?php echo $_SESSION['ls_email']; ?>

###############################################################

// Updates & Bugfixes //

02/20/2010		Fixed a security vulnerability that allowed
				registration even when disabled.

01/04/2009		Improved the encoding algorithms again.

01/01/2009		Improved the encoding algorithms again.

12/31/2008		Improved the encoding algorithms.

12/31/2008		Redesigned the encoding algorithms to include
				a user-supplied hash.  Also fixed a bug that
				caused email addresses with periods to be
				rejected.  Removed the enhanced security
				feature because it is not needed with the new
				encoding algorithms.

12/31/2008		Added custom encoding algorithms to encode
				the data for each user.  Viewing a populated
				user data file will not yield usable data.
				Also added a link back to the login form
				from the registration form.

12/30/2008		Added enhanced security by forcing permission
				changes when flat file access is required by
				the script.

12/30/2008		Fixed a minor XSS vulnerability in the
				registration code as referenced at
				http://www.securityfocus.com/bid/32941

02/20/2008		Version 2.0 Released