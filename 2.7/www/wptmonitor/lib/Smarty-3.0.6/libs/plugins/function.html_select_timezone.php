<?php
/*
 * Smarty plugin
 * -------------------------------------------------------------
 * Type:     function
 * Name:     html_select_timezone
 * Purpose:  Prints the dropdowns for timezone offset selection
 * -------------------------------------------------------------
 * Copyright (c) 2002, Alan McFarlane <amcfarlane@bigfoot.com>
 * All Rights Reserved.
 * -------------------------------------------------------------
 * Revision History:
 *
 *	2002-03-13 - 1.03.00 [AM]
 *		Added support for the 'return' attribute (see docs)
 *
 *	2002-03-12 - 1.02.00 [AM]
 *		Added support for the 'function' attribute (see docs)
 *
 *	2002-03-11 - 1.01.00 [AM]
 *		Added support for full HTML DTD
 *
 *	2002-03-10 - 1.00.00 [AM]
 *		Initial Revision
 *
 */
function smarty_function_html_select_timezone( $params, &$smarty )
{
	// coreattrs
	$id          = null;	// ID               -- document-wide unique id --
	$class       = null;	// CDATA            -- space-separated list of classes --
	$style       = null;	// %stylesheet%     -- associated style info --
	$title       = null;	// %text%           -- advisory title --

	// i18n
	$lang        = null;	// %languagecode%   -- language code --
	$dir         = null;	// (ltr|rtl)        -- direction for weak/neutral text --

	// events
	$onclick     = null;	// %script%         -- a pointer button was clicked --
	$ondblclick  = null;	// %script%         -- a pointer button was double clicked --
	$onmousedown = null;	// %script%         -- a pointer button was pressed down --
	$onmouseup   = null;	// %script%         -- a pointer button was released --
	$onmouseover = null;	// %script%         -- a pointer was moved onto --
	$onmousemove = null;	// %script%         -- a pointer was moved within --
	$onmouseout  = null;	// %script%         -- a pointer was moved away --
	$onkeypress  = null;	// %script%         -- a key was pressed and released --
	$onkeydown   = null;	// %script%         -- a key was pressed down --
	$onkeyup     = null;	// %script%         -- a key was released --

	// select
	$name        = null;	// CDATA            -- field name -- (see docs)
	$size        = null;	// NUMBER           -- rows visible --
	$multiple    = null;	// (multiple)       -- default is single selection -- (see docs)
	$disabled    = null;	// (disabled)       -- unavailable in this context -- (see docs)
	$tabindex    = null;	// NUMBER           -- position in tabbing order --
	$onfocus     = null;	// %script%         -- the element got the focus --
	$onblur      = null;	// %script%         -- the element lost the focus --
	$onchange    = null;	// %script%         -- the element value was changed --

	// smarty specific
	$default     = null;	// (integer|string) -- the default timezone (see docs) --
	$extra       = null;    // string           -- any extra tags -- (see docs)
	$function    = null;	// string           -- the name of the function used to get the timezone data -- (see docs)
	$return      = null;	// string           -- the type of data to return (see docs) --

	// extract the parameters into the local scope
	extract($params);

	// build the tags array
	$tags = array();

	if (!is_null($id))          { $tags[] = "id=\""          . $id          . "\""; }
	if (!is_null($class))       { $tags[] = "class=\""       . $class       . "\""; }
	if (!is_null($style))       { $tags[] = "style=\""       . $style       . "\""; }
	if (!is_null($title))       { $tags[] = "title=\""       . $title       . "\""; }

	if (!is_null($lang))        { $tags[] = "lang=\""        . $id          . "\""; }
	if (!is_null($dir))         { $tags[] = "dir=\""         . $id          . "\""; }

	if (!is_null($onclick))     { $tags[] = "onclick=\""     . $onclick     . "\""; }
	if (!is_null($ondblclick))  { $tags[] = "ondblclick=\""  . $ondblclick  . "\""; }
	if (!is_null($onmousedown)) { $tags[] = "onmousedown=\"" . $onmousedown . "\""; }
	if (!is_null($onmouseup))   { $tags[] = "onmouseup=\""   . $onmouseup   . "\""; }
	if (!is_null($onmouseover)) { $tags[] = "onmouseover=\"" . $onmouseover . "\""; }
	if (!is_null($onmousemove)) { $tags[] = "onmousemove=\"" . $onmousemove . "\""; }
	if (!is_null($onmouseout))  { $tags[] = "onmouseout=\""  . $onmouseout  . "\""; }
	if (!is_null($onkeypress))  { $tags[] = "onkeypress=\""  . $onkeypress  . "\""; }
	if (!is_null($onkeydown))   { $tags[] = "onkeydown=\""   . $onkeydown   . "\""; }
	if (!is_null($onkeyup))     { $tags[] = "onkeyup=\""     . $onkeyup     . "\""; }

	if (!is_null($name))        { $tags[] = "name=\""        . $name        . "\""; }
	if (!is_null($size))        { $tags[] = "size=\""        . $size        . "\""; }
	if (!is_null($multiple))    { $tags[] = "multiple=\""    . $multiple    . "\""; }
	if (!is_null($disabled))    { $tags[] = "disabled=\""    . $disabled    . "\""; }
	if (!is_null($tabindex))    { $tags[] = "tabindex=\""    . $tabindex    . "\""; }
	if (!is_null($onfocus))     { $tags[] = "onfocus=\""     . $onfocus     . "\""; }
	if (!is_null($onblur))      { $tags[] = "onblur=\""      . $onblur      . "\""; }
	if (!is_null($onchange))    { $tags[] = "onchange=\""    . $onchange    . "\""; }

	if (!is_null($extra))       { $tags[] = $extra;                                 }

	// build the select statement
	$select = "<select " . implode(" ", $tags) . ">";

	// get the default value
	if (is_null($default))
	{
		$default = "gmt";
	}
	else if (preg_match("/^[0-9]+$/", $default))
	{
		$default = intval($default);
	}

	// get the timezone data
//	if (is_null($function) || !function_exists($function))
//	{
		$data = &smarty_function_html_select_timezone__get_timezone_data( );
//	}
//	else
//	{
//		$data = &$function( );
//	}

	// get the return type
	$return = is_null($return) ? "default" : strtolower($return);

	// loop through each item
	for ($i = 0, $matched = false; $i < count($data); $i++)
	{
		// build the option statement
		$option = "<option value=\"";

		// add the return type
		switch ($return)
		{
			case "index":
				$option .= $i . "\"";
				break;

			case "name":
				$option .= $data[$i][0] . "\"";
				break;

			case "offset":
				$option .= $data[$i][1] . "\"";
				break;

			case "all":
				$option .= $i . "|" . implode("|", $data[$i]) . "\"";
				break;

			default:
				$option .= implode("|", $data[$i]) . "\"";
				break;
		}
		// scan for the default value
		if (!$matched && !is_null($default))
		{
			if (($default === $i) || !strcasecmp($default, $data[$i][0]))
			{
				$option  .= " selected=\"selected\"";
				$matched  = true;
			}
		}

		// complete the option statement
		$option .= ">" . $data[$i][0] . "</option>";

		// add the option to our select statement
		$select .= $option;
	}

	// complete the select statement
	$select .= "</select>";

	// and finally, output it...
	echo $select;
}

function &smarty_function_html_select_timezone__get_timezone_data( $index = null )
{
	$data = array
	(
		// Zone ID, Offset (in minutes from GMT)
		array( "ACT",                           570 ),
		array( "AET",                           600 ),
		array( "Africa/Abidjan",                  0 ),
		array( "Africa/Accra",                    0 ),
		array( "Africa/Addis_Ababa",            180 ),
		array( "Africa/Algiers",                 60 ),
		array( "Africa/Asmera",                 180 ),
		array( "Africa/Bamako",                   0 ),
		array( "Africa/Bangui",                  60 ),
		array( "Africa/Banjul",                   0 ),
		array( "Africa/Bissau",                   0 ),
		array( "Africa/Blantyre",               120 ),
		array( "Africa/Brazzaville",             60 ),
		array( "Africa/Bujumbura",              120 ),
		array( "Africa/Cairo",                  120 ),
		array( "Africa/Casablanca",               0 ),
		array( "Africa/Ceuta",                   60 ),
		array( "Africa/Conakry",                  0 ),
		array( "Africa/Dakar",                    0 ),
		array( "Africa/Dar_es_Salaam",          180 ),
		array( "Africa/Djibouti",               180 ),
		array( "Africa/Douala",                  60 ),
		array( "Africa/El_Aaiun",                 0 ),
		array( "Africa/Freetown",                 0 ),
		array( "Africa/Gaborone",               120 ),
		array( "Africa/Harare",                 120 ),
		array( "Africa/Johannesburg",           120 ),
		array( "Africa/Kampala",                180 ),
		array( "Africa/Khartoum",               180 ),
		array( "Africa/Kigali",                 120 ),
		array( "Africa/Kinshasa",                60 ),
		array( "Africa/Lagos",                   60 ),
		array( "Africa/Libreville",              60 ),
		array( "Africa/Lome",                     0 ),
		array( "Africa/Luanda",                  60 ),
		array( "Africa/Lubumbashi",             120 ),
		array( "Africa/Lusaka",                 120 ),
		array( "Africa/Malabo",                  60 ),
		array( "Africa/Maputo",                 120 ),
		array( "Africa/Maseru",                 120 ),
		array( "Africa/Mbabane",                120 ),
		array( "Africa/Mogadishu",              180 ),
		array( "Africa/Monrovia",                 0 ),
		array( "Africa/Nairobi",                180 ),
		array( "Africa/Ndjamena",                60 ),
		array( "Africa/Niamey",                  60 ),
		array( "Africa/Nouakchott",               0 ),
		array( "Africa/Ouagadougou",              0 ),
		array( "Africa/Porto-Novo",              60 ),
		array( "Africa/Sao_Tome",                 0 ),
		array( "Africa/Timbuktu",                 0 ),
		array( "Africa/Tripoli",                120 ),
		array( "Africa/Tunis",                   60 ),
		array( "Africa/Windhoek",                60 ),
		array( "AGT",                          -180 ),
		array( "America/Adak",                 -600 ),
		array( "America/Anchorage",            -540 ),
		array( "America/Anguilla",             -240 ),
		array( "America/Antigua",              -240 ),
		array( "America/Araguaina",            -180 ),
		array( "America/Aruba",                -240 ),
		array( "America/Asuncion",             -240 ),
		array( "America/Atka",                 -600 ),
		array( "America/Barbados",             -240 ),
		array( "America/Belem",                -180 ),
		array( "America/Belize",               -360 ),
		array( "America/Boa_Vista",            -240 ),
		array( "America/Bogota",               -300 ),
		array( "America/Boise",                -420 ),
		array( "America/Buenos_Aires",         -180 ),
		array( "America/Cambridge_Bay",        -420 ),
		array( "America/Cancun",               -360 ),
		array( "America/Caracas",              -240 ),
		array( "America/Catamarca",            -180 ),
		array( "America/Cayenne",              -180 ),
		array( "America/Cayman",               -300 ),
		array( "America/Chicago",              -360 ),
		array( "America/Chihuahua",            -420 ),
		array( "America/Cordoba",              -180 ),
		array( "America/Costa_Rica",           -360 ),
		array( "America/Cuiaba",               -240 ),
		array( "America/Curacao",              -240 ),
		array( "America/Danmarkshavn",            0 ),
		array( "America/Dawson_Creek",         -420 ),
		array( "America/Dawson",               -480 ),
		array( "America/Denver",               -420 ),
		array( "America/Detroit",              -300 ),
		array( "America/Dominica",             -240 ),
		array( "America/Edmonton",             -420 ),
		array( "America/Eirunepe",             -300 ),
		array( "America/El_Salvador",          -360 ),
		array( "America/Ensenada",             -480 ),
		array( "America/Fort_Wayne",           -300 ),
		array( "America/Fortaleza",            -180 ),
		array( "America/Glace_Bay",            -240 ),
		array( "America/Godthab",              -180 ),
		array( "America/Goose_Bay",            -240 ),
		array( "America/Grand_Turk",           -300 ),
		array( "America/Grenada",              -240 ),
		array( "America/Guadeloupe",           -240 ),
		array( "America/Guatemala",            -360 ),
		array( "America/Guayaquil",            -300 ),
		array( "America/Guyana",               -240 ),
		array( "America/Halifax",              -240 ),
		array( "America/Havana",               -300 ),
		array( "America/Hermosillo",           -420 ),
		array( "America/Indiana/Indianapolis", -300 ),
		array( "America/Indiana/Knox",         -300 ),
		array( "America/Indiana/Marengo",      -300 ),
		array( "America/Indiana/Vevay",        -300 ),
		array( "America/Indianapolis",         -300 ),
		array( "America/Inuvik",               -420 ),
		array( "America/Iqaluit",              -300 ),
		array( "America/Jamaica",              -300 ),
		array( "America/Jujuy",                -180 ),
		array( "America/Juneau",               -540 ),
		array( "America/Kentucky/Louisville",  -300 ),
		array( "America/Kentucky/Monticello",  -300 ),
		array( "America/Knox_IN",              -300 ),
		array( "America/La_Paz",               -240 ),
		array( "America/Lima",                 -300 ),
		array( "America/Los_Angeles",          -480 ),
		array( "America/Louisville",           -300 ),
		array( "America/Maceio",               -180 ),
		array( "America/Managua",              -360 ),
		array( "America/Manaus",               -240 ),
		array( "America/Martinique",           -240 ),
		array( "America/Mazatlan",             -420 ),
		array( "America/Mendoza",              -180 ),
		array( "America/Menominee",            -360 ),
		array( "America/Merida",               -360 ),
		array( "America/Mexico_City",          -360 ),
		array( "America/Miquelon",             -180 ),
		array( "America/Monterrey",            -360 ),
		array( "America/Montevideo",           -180 ),
		array( "America/Montreal",             -300 ),
		array( "America/Montserrat",           -240 ),
		array( "America/Nassau",               -300 ),
		array( "America/New_York",             -300 ),
		array( "America/Nipigon",              -300 ),
		array( "America/Nome",                 -540 ),
		array( "America/Noronha",              -120 ),
		array( "America/North_Dakota/Center",  -360 ),
		array( "America/Panama",               -300 ),
		array( "America/Pangnirtung",          -300 ),
		array( "America/Paramaribo",           -180 ),
		array( "America/Phoenix",              -420 ),
		array( "America/Port_of_Spain",        -240 ),
		array( "America/Port-au-Prince",       -300 ),
		array( "America/Porto_Acre",           -300 ),
		array( "America/Porto_Velho",          -240 ),
		array( "America/Puerto_Rico",          -240 ),
		array( "America/Rainy_River",          -360 ),
		array( "America/Rankin_Inlet",         -360 ),
		array( "America/Recife",               -180 ),
		array( "America/Regina",               -360 ),
		array( "America/Rio_Branco",           -300 ),
		array( "America/Rosario",              -180 ),
		array( "America/Santiago",             -240 ),
		array( "America/Santo_Domingo",        -240 ),
		array( "America/Sao_Paulo",            -180 ),
		array( "America/Scoresbysund",          -60 ),
		array( "America/Shiprock",             -420 ),
		array( "America/St_Johns",             -210 ),
		array( "America/St_Kitts",             -240 ),
		array( "America/St_Lucia",             -240 ),
		array( "America/St_Thomas",            -240 ),
		array( "America/St_Vincent",           -240 ),
		array( "America/Swift_Current",        -360 ),
		array( "America/Tegucigalpa",          -360 ),
		array( "America/Thule",                -240 ),
		array( "America/Thunder_Bay",          -300 ),
		array( "America/Tijuana",              -480 ),
		array( "America/Tortola",              -240 ),
		array( "America/Vancouver",            -480 ),
		array( "America/Virgin",               -240 ),
		array( "America/Whitehorse",           -480 ),
		array( "America/Winnipeg",             -360 ),
		array( "America/Yakutat",              -540 ),
		array( "America/Yellowknife",          -420 ),
		array( "Antarctica/Casey",              480 ),
		array( "Antarctica/Davis",              420 ),
		array( "Antarctica/DumontDUrville",     600 ),
		array( "Antarctica/Mawson",             360 ),
		array( "Antarctica/McMurdo",            720 ),
		array( "Antarctica/Palmer",            -240 ),
		array( "Antarctica/South_Pole",         720 ),
		array( "Antarctica/Syowa",              180 ),
		array( "Antarctica/Vostok",             360 ),
		array( "Arctic/Longyearbyen",            60 ),
		array( "ART",                           120 ),
		array( "Asia/Aden",                     180 ),
		array( "Asia/Almaty",                   360 ),
		array( "Asia/Amman",                    120 ),
		array( "Asia/Anadyr",                   720 ),
		array( "Asia/Aqtau",                    240 ),
		array( "Asia/Aqtobe",                   300 ),
		array( "Asia/Ashgabat",                 300 ),
		array( "Asia/Ashkhabad",                300 ),
		array( "Asia/Baghdad",                  180 ),
		array( "Asia/Bahrain",                  180 ),
		array( "Asia/Baku",                     240 ),
		array( "Asia/Bangkok",                  420 ),
		array( "Asia/Beirut",                   120 ),
		array( "Asia/Bishkek",                  300 ),
		array( "Asia/Brunei",                   480 ),
		array( "Asia/Calcutta",                 330 ),
		array( "Asia/Choibalsan",               540 ),
		array( "Asia/Chongqing",                480 ),
		array( "Asia/Chungking",                480 ),
		array( "Asia/Colombo",                  360 ),
		array( "Asia/Dacca",                    360 ),
		array( "Asia/Damascus",                 120 ),
		array( "Asia/Dhaka",                    360 ),
		array( "Asia/Dili",                     540 ),
		array( "Asia/Dubai",                    240 ),
		array( "Asia/Dushanbe",                 300 ),
		array( "Asia/Gaza",                     120 ),
		array( "Asia/Harbin",                   480 ),
		array( "Asia/Hong_Kong",                480 ),
		array( "Asia/Hovd",                     420 ),
		array( "Asia/Irkutsk",                  480 ),
		array( "Asia/Istanbul",                 120 ),
		array( "Asia/Jakarta",                  420 ),
		array( "Asia/Jayapura",                 540 ),
		array( "Asia/Jerusalem",                120 ),
		array( "Asia/Kabul",                    270 ),
		array( "Asia/Kamchatka",                720 ),
		array( "Asia/Karachi",                  300 ),
		array( "Asia/Kashgar",                  480 ),
		array( "Asia/Katmandu",                 345 ),
		array( "Asia/Krasnoyarsk",              420 ),
		array( "Asia/Kuala_Lumpur",             480 ),
		array( "Asia/Kuching",                  480 ),
		array( "Asia/Kuwait",                   180 ),
		array( "Asia/Macao",                    480 ),
		array( "Asia/Magadan",                  660 ),
		array( "Asia/Manila",                   480 ),
		array( "Asia/Muscat",                   240 ),
		array( "Asia/Nicosia",                  120 ),
		array( "Asia/Novosibirsk",              360 ),
		array( "Asia/Omsk",                     360 ),
		array( "Asia/Phnom_Penh",               420 ),
		array( "Asia/Pontianak",                420 ),
		array( "Asia/Pyongyang",                540 ),
		array( "Asia/Qatar",                    180 ),
		array( "Asia/Rangoon",                  390 ),
		array( "Asia/Riyadh",                   180 ),
		array( "Asia/Riyadh87",                 187 ),
		array( "Asia/Riyadh88",                 187 ),
		array( "Asia/Riyadh89",                 187 ),
		array( "Asia/Saigon",                   420 ),
		array( "Asia/Sakhalin",                 600 ),
		array( "Asia/Samarkand",                300 ),
		array( "Asia/Seoul",                    540 ),
		array( "Asia/Shanghai",                 480 ),
		array( "Asia/Singapore",                480 ),
		array( "Asia/Taipei",                   480 ),
		array( "Asia/Tashkent",                 300 ),
		array( "Asia/Tbilisi",                  240 ),
		array( "Asia/Tehran",                   210 ),
		array( "Asia/Tel_Aviv",                 120 ),
		array( "Asia/Thimbu",                   360 ),
		array( "Asia/Thimphu",                  360 ),
		array( "Asia/Tokyo",                    540 ),
		array( "Asia/Ujung_Pandang",            480 ),
		array( "Asia/Ulaanbaatar",              480 ),
		array( "Asia/Ulan_Bator",               480 ),
		array( "Asia/Urumqi",                   480 ),
		array( "Asia/Vientiane",                420 ),
		array( "Asia/Vladivostok",              600 ),
		array( "Asia/Yakutsk",                  540 ),
		array( "Asia/Yekaterinburg",            300 ),
		array( "Asia/Yerevan",                  240 ),
		array( "AST",                          -540 ),
		array( "Atlantic/Azores",               -60 ),
		array( "Atlantic/Bermuda",             -240 ),
		array( "Atlantic/Canary",                 0 ),
		array( "Atlantic/Cape_Verde",           -60 ),
		array( "Atlantic/Faeroe",                 0 ),
		array( "Atlantic/Jan_Mayen",             60 ),
		array( "Atlantic/Madeira",                0 ),
		array( "Atlantic/Reykjavik",              0 ),
		array( "Atlantic/South_Georgia",       -120 ),
		array( "Atlantic/St_Helena",              0 ),
		array( "Atlantic/Stanley",             -240 ),
		array( "Australia/ACT",                 600 ),
		array( "Australia/Adelaide",            570 ),
		array( "Australia/Brisbane",            600 ),
		array( "Australia/Broken_Hill",         570 ),
		array( "Australia/Canberra",            600 ),
		array( "Australia/Darwin",              570 ),
		array( "Australia/Hobart",              600 ),
		array( "Australia/LHI",                 630 ),
		array( "Australia/Lindeman",            600 ),
		array( "Australia/Lord_Howe",           630 ),
		array( "Australia/Melbourne",           600 ),
		array( "Australia/North",               570 ),
		array( "Australia/NSW",                 600 ),
		array( "Australia/Perth",               480 ),
		array( "Australia/Queensland",          600 ),
		array( "Australia/South",               570 ),
		array( "Australia/Sydney",              600 ),
		array( "Australia/Tasmania",            600 ),
		array( "Australia/Victoria",            600 ),
		array( "Australia/West",                480 ),
		array( "Australia/Yancowinna",          570 ),
		array( "BET",                          -180 ),
		array( "Brazil/Acre",                  -300 ),
		array( "Brazil/DeNoronha",             -120 ),
		array( "Brazil/East",                  -180 ),
		array( "Brazil/West",                  -240 ),
		array( "BST",                           360 ),
		array( "Canada/Atlantic",              -240 ),
		array( "Canada/Central",               -360 ),
		array( "Canada/Eastern",               -300 ),
		array( "Canada/East-Saskatchewan",     -360 ),
		array( "Canada/Mountain",              -420 ),
		array( "Canada/Newfoundland",          -210 ),
		array( "Canada/Pacific",               -480 ),
		array( "Canada/Saskatchewan",          -360 ),
		array( "Canada/Yukon",                 -480 ),
		array( "CAT",                           120 ),
		array( "CET",                            60 ),
		array( "Chile/Continental",            -240 ),
		array( "Chile/EasterIsland",           -360 ),
		array( "CNT",                          -210 ),
		array( "CST",                          -360 ),
		array( "CST6CDT",                      -360 ),
		array( "CTT",                           480 ),
		array( "Cuba",                         -300 ),
		array( "EAT",                           180 ),
		array( "ECT",                            60 ),
		array( "EET",                           120 ),
		array( "Egypt",                         120 ),
		array( "Eire",                            0 ),
		array( "EST",                          -300 ),
		array( "EST5EDT",                      -300 ),
		array( "Etc/GMT+0",                       0 ),
		array( "Etc/GMT+1",                     -60 ),
		array( "Etc/GMT+10",                   -600 ),
		array( "Etc/GMT+11",                   -660 ),
		array( "Etc/GMT+12",                   -720 ),
		array( "Etc/GMT+2",                    -120 ),
		array( "Etc/GMT+3",                    -180 ),
		array( "Etc/GMT+4",                    -240 ),
		array( "Etc/GMT+5",                    -300 ),
		array( "Etc/GMT+6",                    -360 ),
		array( "Etc/GMT+7",                    -420 ),
		array( "Etc/GMT+8",                    -480 ),
		array( "Etc/GMT+9",                    -540 ),
		array( "Etc/GMT",                         0 ),
		array( "Etc/GMT0",                        0 ),
		array( "Etc/GMT-0",                       0 ),
		array( "Etc/GMT-1",                      60 ),
		array( "Etc/GMT-10",                    600 ),
		array( "Etc/GMT-11",                    660 ),
		array( "Etc/GMT-12",                    720 ),
		array( "Etc/GMT-13",                    780 ),
		array( "Etc/GMT-14",                    840 ),
		array( "Etc/GMT-2",                     120 ),
		array( "Etc/GMT-3",                     180 ),
		array( "Etc/GMT-4",                     240 ),
		array( "Etc/GMT-5",                     300 ),
		array( "Etc/GMT-6",                     360 ),
		array( "Etc/GMT-7",                     420 ),
		array( "Etc/GMT-8",                     480 ),
		array( "Etc/GMT-9",                     540 ),
		array( "Etc/Greenwich",                   0 ),
		array( "Etc/UCT",                         0 ),
		array( "Etc/Universal",                   0 ),
		array( "Etc/UTC",                         0 ),
		array( "Etc/Zulu",                        0 ),
		array( "Europe/Amsterdam",               60 ),
		array( "Europe/Andorra",                 60 ),
		array( "Europe/Athens",                 120 ),
		array( "Europe/Belfast",                  0 ),
		array( "Europe/Belgrade",                60 ),
		array( "Europe/Berlin",                  60 ),
		array( "Europe/Bratislava",              60 ),
		array( "Europe/Brussels",                60 ),
		array( "Europe/Bucharest",              120 ),
		array( "Europe/Budapest",                60 ),
		array( "Europe/Chisinau",               120 ),
		array( "Europe/Copenhagen",              60 ),
		array( "Europe/Dublin",                   0 ),
		array( "Europe/Gibraltar",               60 ),
		array( "Europe/Helsinki",               120 ),
		array( "Europe/Istanbul",               120 ),
		array( "Europe/Kaliningrad",            120 ),
		array( "Europe/Kiev",                   120 ),
		array( "Europe/Lisbon",                   0 ),
		array( "Europe/Ljubljana",               60 ),
		array( "Europe/London",                   0 ),
		array( "Europe/Luxembourg",              60 ),
		array( "Europe/Madrid",                  60 ),
		array( "Europe/Malta",                   60 ),
		array( "Europe/Minsk",                  120 ),
		array( "Europe/Monaco",                  60 ),
		array( "Europe/Moscow",                 180 ),
		array( "Europe/Nicosia",                120 ),
		array( "Europe/Oslo",                    60 ),
		array( "Europe/Paris",                   60 ),
		array( "Europe/Prague",                  60 ),
		array( "Europe/Riga",                   120 ),
		array( "Europe/Rome",                    60 ),
		array( "Europe/Samara",                 240 ),
		array( "Europe/San_Marino",              60 ),
		array( "Europe/Sarajevo",                60 ),
		array( "Europe/Simferopol",             120 ),
		array( "Europe/Skopje",                  60 ),
		array( "Europe/Sofia",                  120 ),
		array( "Europe/Stockholm",               60 ),
		array( "Europe/Tallinn",                120 ),
		array( "Europe/Tirane",                  60 ),
		array( "Europe/Tiraspol",               120 ),
		array( "Europe/Uzhgorod",               120 ),
		array( "Europe/Vaduz",                   60 ),
		array( "Europe/Vatican",                 60 ),
		array( "Europe/Vienna",                  60 ),
		array( "Europe/Vilnius",                120 ),
		array( "Europe/Warsaw",                  60 ),
		array( "Europe/Zagreb",                  60 ),
		array( "Europe/Zaporozhye",             120 ),
		array( "Europe/Zurich",                  60 ),
		array( "GB",                              0 ),
		array( "GB-Eire",                         0 ),
		array( "GMT",                             0 ),
		array( "GMT0",                            0 ),
		array( "Greenwich",                       0 ),
		array( "Hongkong",                      480 ),
		array( "HST",                          -600 ),
		array( "Iceland",                         0 ),
		array( "IET",                          -300 ),
		array( "Indian/Antananarivo",           180 ),
		array( "Indian/Chagos",                 360 ),
		array( "Indian/Christmas",              420 ),
		array( "Indian/Cocos",                  390 ),
		array( "Indian/Comoro",                 180 ),
		array( "Indian/Kerguelen",              300 ),
		array( "Indian/Mahe",                   240 ),
		array( "Indian/Maldives",               300 ),
		array( "Indian/Mauritius",              240 ),
		array( "Indian/Mayotte",                180 ),
		array( "Indian/Reunion",                240 ),
		array( "Iran",                          210 ),
		array( "Israel",                        120 ),
		array( "IST",                           330 ),
		array( "Jamaica",                      -300 ),
		array( "Japan",                         540 ),
		array( "JST",                           540 ),
		array( "Kwajalein",                     720 ),
		array( "Libya",                         120 ),
		array( "MET",                            60 ),
		array( "Mexico/BajaNorte",             -480 ),
		array( "Mexico/BajaSur",               -420 ),
		array( "Mexico/General",               -360 ),
		array( "Mideast/Riyadh87",              187 ),
		array( "Mideast/Riyadh88",              187 ),
		array( "Mideast/Riyadh89",              187 ),
		array( "MIT",                          -660 ),
		array( "MST",                          -420 ),
		array( "MST7MDT",                      -420 ),
		array( "Navajo",                       -420 ),
		array( "NET",                           240 ),
		array( "NST",                           720 ),
		array( "NZ",                            720 ),
		array( "NZ-CHAT",                       765 ),
		array( "Pacific/Apia",                 -660 ),
		array( "Pacific/Auckland",              720 ),
		array( "Pacific/Chatham",               765 ),
		array( "Pacific/Easter",               -360 ),
		array( "Pacific/Efate",                 660 ),
		array( "Pacific/Enderbury",             780 ),
		array( "Pacific/Fakaofo",              -600 ),
		array( "Pacific/Fiji",                  720 ),
		array( "Pacific/Funafuti",              720 ),
		array( "Pacific/Galapagos",            -360 ),
		array( "Pacific/Gambier",              -540 ),
		array( "Pacific/Guadalcanal",           660 ),
		array( "Pacific/Guam",                  600 ),
		array( "Pacific/Honolulu",             -600 ),
		array( "Pacific/Johnston",             -600 ),
		array( "Pacific/Kiritimati",            840 ),
		array( "Pacific/Kosrae",                660 ),
		array( "Pacific/Kwajalein",             720 ),
		array( "Pacific/Majuro",                720 ),
		array( "Pacific/Marquesas",            -570 ),
		array( "Pacific/Midway",               -660 ),
		array( "Pacific/Nauru",                 720 ),
		array( "Pacific/Niue",                 -660 ),
		array( "Pacific/Norfolk",               690 ),
		array( "Pacific/Noumea",                660 ),
		array( "Pacific/Pago_Pago",            -660 ),
		array( "Pacific/Palau",                 540 ),
		array( "Pacific/Pitcairn",             -480 ),
		array( "Pacific/Ponape",                660 ),
		array( "Pacific/Port_Moresby",          600 ),
		array( "Pacific/Rarotonga",            -600 ),
		array( "Pacific/Saipan",                600 ),
		array( "Pacific/Samoa",                -660 ),
		array( "Pacific/Tahiti",               -600 ),
		array( "Pacific/Tarawa",                720 ),
		array( "Pacific/Tongatapu",             780 ),
		array( "Pacific/Truk",                  600 ),
		array( "Pacific/Wake",                  720 ),
		array( "Pacific/Wallis",                720 ),
		array( "Pacific/Yap",                   600 ),
		array( "PLT",                           300 ),
		array( "PNT",                          -420 ),
		array( "Poland",                         60 ),
		array( "Portugal",                        0 ),
		array( "PRC",                           480 ),
		array( "PRT",                          -240 ),
		array( "PST",                          -480 ),
		array( "PST8PDT",                      -480 ),
		array( "ROK",                           540 ),
		array( "Singapore",                     480 ),
		array( "SST",                           660 ),
		array( "SystemV/AST4",                 -240 ),
		array( "SystemV/AST4ADT",              -240 ),
		array( "SystemV/CST6",                 -360 ),
		array( "SystemV/CST6CDT",              -360 ),
		array( "SystemV/EST5",                 -300 ),
		array( "SystemV/EST5EDT",              -300 ),
		array( "SystemV/HST10",                -600 ),
		array( "SystemV/MST7",                 -420 ),
		array( "SystemV/MST7MDT",              -420 ),
		array( "SystemV/PST8",                 -480 ),
		array( "SystemV/PST8PDT",              -480 ),
		array( "SystemV/YST9",                 -540 ),
		array( "SystemV/YST9YDT",              -540 ),
		array( "Turkey",                        120 ),
		array( "UCT",                             0 ),
		array( "Universal",                       0 ),
		array( "US/Alaska",                    -540 ),
		array( "US/Aleutian",                  -600 ),
		array( "US/Arizona",                   -420 ),
		array( "US/Central",                   -360 ),
		array( "US/Eastern",                   -300 ),
		array( "US/East-Indiana",              -300 ),
		array( "US/Hawaii",                    -600 ),
		array( "US/Indiana-Starke",            -300 ),
		array( "US/Michigan",                  -300 ),
		array( "US/Mountain",                  -420 ),
		array( "US/Pacific",                   -480 ),
		array( "US/Pacific-New",               -480 ),
		array( "US/Samoa",                     -660 ),
		array( "UTC",                             0 ),
		array( "VST",                           420 ),
		array( "WET",                             0 ),
		array( "W-SU",                          180 ),
		array( "Zulu",                            0 ),
	);

	if (!isset($index))
	{
		return $data;
	}

	if (is_integer($index) && ($index >= 0) && ($index < count($data)))
	{
		return $data[$index];
	}

	return array();
}
?>