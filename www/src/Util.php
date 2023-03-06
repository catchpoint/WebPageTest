<?php

declare(strict_types=1);

namespace WebPageTest;

use WebPageTest\Util\Cache;

class Util
{
    private static array $SETTINGS = [];
    private const SETTINGS_KEY = 'settings';
    private static string $settings_dir = SETTINGS_PATH;

    public function __construct()
    {
        throw new \Exception("Util should not be instantiated. It only has static methods.");
    }

    /**
     * @param false|null|string $default
     */
    public static function getSetting(string $setting, $default = false, string $override_settings_file = "")
    {
        if (empty(self::$SETTINGS)) {
            self::$SETTINGS = Cache::fetch(self::SETTINGS_KEY) ?? [];
            if (empty(self::$SETTINGS)) {
                self::loadAndStoreSettings($override_settings_file);
            }
        }

        $ret = self::$SETTINGS[$setting] ?? $default;
        return $ret;
    }

    /**
     * Let's not make all the cookies TOO obvious. Let's sha1 hash and salt em
     *
     * Pass in a name
     */
    public static function getCookieName(string $name): string
    {
        $salt = self::getServerSecret();
        $hash = hash('sha1', $name);
        return hash('sha256', $hash . $salt);
    }


    public static function getServerSecret()
    {
        // cache the status in apc for 15 seconds so we don't hammer the scheduler
        $settings_dir = self::$settings_dir;
        $secret = Cache::fetch('server-secret');
        if (isset($secret) && !is_string($secret)) {
            $secret = null;
        }
        if (!isset($secret)) {
            $keys_file = "{$settings_dir}/keys.ini";
            if (file_exists("{$settings_dir}/common/keys.ini")) {
                $keys_file = "{$settings_dir}/common/keys.ini";
            }
            if (file_exists("{$settings_dir}/server/keys.ini")) {
                $keys_file = "{$settings_dir}/server/keys.ini";
            }
            $keys = parse_ini_file($keys_file, true);
            if (isset($keys) && isset($keys['server']['secret'])) {
                $secret = trim($keys['server']['secret']);
            }

            $ttl = 3600;
            if (!isset($secret)) {
                $secret = '';
                $ttl = 60;
            }
            Cache::store('server-secret', $secret, $ttl);
        }
        return $secret;
    }

    private static function loadAndStoreSettings(string $override_filepath = ""): void
    {
        if ($override_filepath != "") {
            if (file_exists($override_filepath)) {
                self::$SETTINGS = parse_ini_file($override_filepath);
            }
            Cache::store(self::SETTINGS_KEY, self::$SETTINGS, 60);
            return;
        }

        $global_settings_file = self::$settings_dir . "/settings.ini";
        $common_settings_file = self::$settings_dir . "/common/settings.ini";
        $server_specific_settings_file = self::$settings_dir . "/server/settings.ini";

        // Load the global settings
        if (file_exists($global_settings_file)) {
            self::$SETTINGS = parse_ini_file($global_settings_file);
        }
        // Load common settings as overrides
        if (file_exists($common_settings_file)) {
            $common = parse_ini_file($common_settings_file);
            self::$SETTINGS = array_merge(self::$SETTINGS, $common);
        }
        // Load server-specific settings as overrides
        if (file_exists($server_specific_settings_file)) {
            $server = parse_ini_file($server_specific_settings_file);
            self::$SETTINGS = array_merge(self::$SETTINGS, $server);
        }

        Cache::store(self::SETTINGS_KEY, self::$SETTINGS, 60);
    }

    public static function getStateList(): array
    {
        $states = array(
            'AL' => 'Alabama',
            'AK' => 'Alaska',
            'AZ' => 'Arizona',
            'AR' => 'Arkansas',
            'CA' => 'California',
            'CO' => 'Colorado',
            'CT' => 'Connecticut',
            'DE' => 'Delaware',
            'DC' => 'District of Columbia',
            'FL' => 'Florida',
            'GA' => 'Georgia',
            'HI' => 'Hawaii',
            'ID' => 'Idaho',
            'IL' => 'Illinois',
            'IN' => 'Indiana',
            'IA' => 'Iowa',
            'KS' => 'Kansas',
            'KY' => 'Kentucky',
            'LA' => 'Louisiana',
            'ME' => 'Maine',
            'MD' => 'Maryland',
            'MA' => 'Massachusetts',
            'MI' => 'Michigan',
            'MN' => 'Minnesota',
            'MS' => 'Mississippi',
            'MO' => 'Missouri',
            'MT' => 'Montana',
            'NE' => 'Nebraska',
            'NV' => 'Nevada',
            'NH' => 'New Hampshire',
            'NJ' => 'New Jersey',
            'NM' => 'New Mexico',
            'NY' => 'New York',
            'NC' => 'North Carolina',
            'ND' => 'North Dakota',
            'OH' => 'Ohio',
            'OK' => 'Oklahoma',
            'OR' => 'Oregon',
            'PA' => 'Pennsylvania',
            'RI' => 'Rhode Island',
            'SC' => 'South Carolina',
            'SD' => 'South Dakota',
            'TN' => 'Tennessee',
            'TX' => 'Texas',
            'UT' => 'Utah',
            'VT' => 'Vermont',
            'VA' => 'Virginia',
            'WA' => 'Washington',
            'WV' => 'West Virginia',
            'WI' => 'Wisconsin',
            'WY' => 'Wyoming',
        );
        return $states;
    }

    public static function getChargifyUSStateList(): array
    {
        $states = [
            ["code" => "AL", "name" => "Alabama"],
            ["code" => "AK", "name" => "Alaska"],
            ["code" => "AZ", "name" => "Arizona"],
            ["code" => "AR", "name" => "Arkansas"],
            ["code" => "CA", "name" => "California"],
            ["code" => "CO", "name" => "Colorado"],
            ["code" => "CT", "name" => "Connecticut"],
            ["code" => "DE", "name" => "Delaware"],
            ["code" => "FL", "name" => "Florida"],
            ["code" => "GA", "name" => "Georgia"],
            ["code" => "HI", "name" => "Hawaii"],
            ["code" => "ID", "name" => "Idaho"],
            ["code" => "IL", "name" => "Illinois"],
            ["code" => "IN", "name" => "Indiana"],
            ["code" => "IA", "name" => "Iowa"],
            ["code" => "KS", "name" => "Kansas"],
            ["code" => "KY", "name" => "Kentucky"],
            ["code" => "LA", "name" => "Louisiana"],
            ["code" => "ME", "name" => "Maine"],
            ["code" => "MD", "name" => "Maryland"],
            ["code" => "MA", "name" => "Massachusetts"],
            ["code" => "MI", "name" => "Michigan"],
            ["code" => "MN", "name" => "Minnesota"],
            ["code" => "MS", "name" => "Mississippi"],
            ["code" => "MO", "name" => "Missouri"],
            ["code" => "MT", "name" => "Montana"],
            ["code" => "NE", "name" => "Nebraska"],
            ["code" => "NV", "name" => "Nevada"],
            ["code" => "NH", "name" => "New Hampshire"],
            ["code" => "NJ", "name" => "New Jersey"],
            ["code" => "NM", "name" => "New Mexico"],
            ["code" => "NY", "name" => "New York"],
            ["code" => "NC", "name" => "North Carolina"],
            ["code" => "ND", "name" => "North Dakota"],
            ["code" => "OH", "name" => "Ohio"],
            ["code" => "OK", "name" => "Oklahoma"],
            ["code" => "OR", "name" => "Oregon"],
            ["code" => "PA", "name" => "Pennsylvania"],
            ["code" => "RI", "name" => "Rhode Island"],
            ["code" => "SC", "name" => "South Carolina"],
            ["code" => "SD", "name" => "South Dakota"],
            ["code" => "TN", "name" => "Tennessee"],
            ["code" => "TX", "name" => "Texas"],
            ["code" => "UT", "name" => "Utah"],
            ["code" => "VT", "name" => "Vermont"],
            ["code" => "VA", "name" => "Virginia"],
            ["code" => "WA", "name" => "Washington"],
            ["code" => "WV", "name" => "West Virginia"],
            ["code" => "WI", "name" => "Wisconsin"],
            ["code" => "WY", "name" => "Wyoming"],
            ["code" => "DC", "name" => "District of Columbia"],
            ["code" => "AS", "name" => "American Samoa"],
            ["code" => "GU", "name" => "Guam"],
            ["code" => "MP", "name" => "Northern Mariana Islands"],
            ["code" => "PR", "name" => "Puerto Rico"],
            ["code" => "UM", "name" => "United States Minor Outlying Islands"],
            ["code" => "VI", "name" => "Virgin Islands, U.S."]
        ];

        return $states;
    }

    public static function getChargifyCountryList(): array
    {
        $country_list = [
            ["code" => "US", "name" => "United States"],
            ["code" => "AF", "name" => "Afghanistan"],
            ["code" => "AL", "name" => "Albania"],
            ["code" => "DZ", "name" => "Algeria"],
            ["code" => "AS", "name" => "American Samoa"],
            ["code" => "AD", "name" => "Andorra"],
            ["code" => "AO", "name" => "Angola"],
            ["code" => "AI", "name" => "Anguilla"],
            ["code" => "AQ", "name" => "Antarctica"],
            ["code" => "AG", "name" => "Antigua & Barbuda"],
            ["code" => "AR", "name" => "Argentina"],
            ["code" => "AM", "name" => "Armenia"],
            ["code" => "AW", "name" => "Aruba"],
            ["code" => "AU", "name" => "Australia"],
            ["code" => "AT", "name" => "Austria"],
            ["code" => "AZ", "name" => "Azerbaijan"],
            ["code" => "BS", "name" => "Bahamas"],
            ["code" => "BH", "name" => "Bahrain"],
            ["code" => "BD", "name" => "Bangladesh"],
            ["code" => "BB", "name" => "Barbados"],
            ["code" => "BY", "name" => "Belarus"],
            ["code" => "BE", "name" => "Belgium"],
            ["code" => "BZ", "name" => "Belize"],
            ["code" => "BJ", "name" => "Benin"],
            ["code" => "BM", "name" => "Bermuda"],
            ["code" => "BT", "name" => "Bhutan"],
            ["code" => "BO", "name" => "Bolivia"],
            ["code" => "BA", "name" => "Bosnia & Herzegovina"],
            ["code" => "BW", "name" => "Botswana"],
            ["code" => "BV", "name" => "Bouvet Island"],
            ["code" => "BR", "name" => "Brazil"],
            ["code" => "IO", "name" => "British Indian Ocean Territory"],
            ["code" => "BN", "name" => "Brunei Darussalam"],
            ["code" => "BG", "name" => "Bulgaria"],
            ["code" => "BF", "name" => "Burkina Faso"],
            ["code" => "BI", "name" => "Burundi"],
            ["code" => "KH", "name" => "Cambodia"],
            ["code" => "CM", "name" => "Cameroon"],
            ["code" => "CA", "name" => "Canada"],
            ["code" => "CV", "name" => "Cape Verde"],
            ["code" => "KY", "name" => "Cayman Islands"],
            ["code" => "CF", "name" => "Central African Republic"],
            ["code" => "TD", "name" => "Chad"],
            ["code" => "CL", "name" => "Chile"],
            ["code" => "CN", "name" => "China"],
            ["code" => "CX", "name" => "Christmas Island"],
            ["code" => "CC", "name" => "Cocos (Keeling) Islands"],
            ["code" => "CO", "name" => "Colombia"],
            ["code" => "KM", "name" => "Comoros"],
            ["code" => "CG", "name" => "Congo"],
            ["code" => "CD", "name" => "Zaire"],
            ["code" => "CK", "name" => "Cook Islands"],
            ["code" => "CR", "name" => "Costa Rica"],
            ["code" => "CI", "name" => "Cote D'ivoire (Ivory Coast)"],
            ["code" => "HR", "name" => "Croatia (Hrvatska)"],
            ["code" => "CU", "name" => "Cuba"],
            ["code" => "CY", "name" => "Cyprus"],
            ["code" => "CZ", "name" => "Czech Republic"],
            ["code" => "DK", "name" => "Denmark"],
            ["code" => "DJ", "name" => "Djibouti"],
            ["code" => "DM", "name" => "Dominica"],
            ["code" => "DO", "name" => "Dominican Republic"],
            ["code" => "TP", "name" => "East Timor"],
            ["code" => "EC", "name" => "Ecuador"],
            ["code" => "EG", "name" => "Egypt"],
            ["code" => "SV", "name" => "El Salvador"],
            ["code" => "GQ", "name" => "Equatorial Guinea"],
            ["code" => "ER", "name" => "Eritrea"],
            ["code" => "EE", "name" => "Estonia"],
            ["code" => "ET", "name" => "Ethiopia"],
            ["code" => "FK", "name" => "Falkland Islands (Malvinas)"],
            ["code" => "FO", "name" => "Faroe Islands"],
            ["code" => "FJ", "name" => "Fiji"],
            ["code" => "FI", "name" => "Finland"],
            ["code" => "FR", "name" => "France"],
            ["code" => "GF", "name" => "French Guiana"],
            ["code" => "PF", "name" => "French Polynesia"],
            ["code" => "TF", "name" => "French Southern Territories"],
            ["code" => "GA", "name" => "Gabon"],
            ["code" => "GM", "name" => "Gambia"],
            ["code" => "GE", "name" => "Georgia"],
            ["code" => "DE", "name" => "Germany"],
            ["code" => "GH", "name" => "Ghana"],
            ["code" => "GI", "name" => "Gibraltar"],
            ["code" => "GB", "name" => "United Kingdom"],
            ["code" => "GR", "name" => "Greece"],
            ["code" => "GL", "name" => "Greenland"],
            ["code" => "GD", "name" => "Grenada"],
            ["code" => "GP", "name" => "Guadeloupe"],
            ["code" => "GU", "name" => "Guam"],
            ["code" => "GT", "name" => "Guatemala"],
            ["code" => "GN", "name" => "Guinea"],
            ["code" => "GW", "name" => "Guinea-Bissau"],
            ["code" => "GY", "name" => "Guyana"],
            ["code" => "HT", "name" => "Haiti"],
            ["code" => "HM", "name" => "Heard & McDonald Islands"],
            ["code" => "VA", "name" => "Vatican City (Holy See)"],
            ["code" => "HN", "name" => "Honduras"],
            ["code" => "HK", "name" => "Hong Kong"],
            ["code" => "HU", "name" => "Hungary"],
            ["code" => "IS", "name" => "Iceland"],
            ["code" => "IN", "name" => "India"],
            ["code" => "ID", "name" => "Indonesia"],
            ["code" => "IR", "name" => "Iran"],
            ["code" => "IQ", "name" => "Iraq"],
            ["code" => "IE", "name" => "Ireland"],
            ["code" => "IL", "name" => "Israel"],
            ["code" => "IT", "name" => "Italy"],
            ["code" => "JM", "name" => "Jamaica"],
            ["code" => "JP", "name" => "Japan"],
            ["code" => "JO", "name" => "Jordan"],
            ["code" => "KZ", "name" => "Kazakhstan"],
            ["code" => "KE", "name" => "Kenya"],
            ["code" => "KI", "name" => "Kiribati"],
            ["code" => "KP", "name" => "Korea (North)"],
            ["code" => "KR", "name" => "Korea (South)"],
            ["code" => "KW", "name" => "Kuwait"],
            ["code" => "KG", "name" => "Kyrgyzstan"],
            ["code" => "LA", "name" => "Laos"],
            ["code" => "LV", "name" => "Latvia"],
            ["code" => "LB", "name" => "Lebanon"],
            ["code" => "LS", "name" => "Lesotho"],
            ["code" => "LR", "name" => "Liberia"],
            ["code" => "LY", "name" => "Libya"],
            ["code" => "LI", "name" => "Liechtenstein"],
            ["code" => "LT", "name" => "Lithuania"],
            ["code" => "LU", "name" => "Luxembourg"],
            ["code" => "MO", "name" => "Macau"],
            ["code" => "MK", "name" => "Macedonia"],
            ["code" => "MG", "name" => "Madagascar"],
            ["code" => "MW", "name" => "Malawi"],
            ["code" => "MY", "name" => "Malaysia"],
            ["code" => "MV", "name" => "Maldives"],
            ["code" => "ML", "name" => "Mali"],
            ["code" => "MT", "name" => "Malta"],
            ["code" => "MH", "name" => "Marshall Islands"],
            ["code" => "MQ", "name" => "Martinique"],
            ["code" => "MR", "name" => "Mauritania"],
            ["code" => "MU", "name" => "Mauritius"],
            ["code" => "YT", "name" => "Mayotte"],
            ["code" => "MX", "name" => "Mexico"],
            ["code" => "FM", "name" => "Micronesia"],
            ["code" => "MD", "name" => "Moldova"],
            ["code" => "MC", "name" => "Monaco"],
            ["code" => "MN", "name" => "Mongolia"],
            ["code" => "MS", "name" => "Montserrat"],
            ["code" => "MA", "name" => "Morocco"],
            ["code" => "MZ", "name" => "Mozambique"],
            ["code" => "MM", "name" => "Myanmar"],
            ["code" => "NA", "name" => "Namibia"],
            ["code" => "NR", "name" => "Nauru"],
            ["code" => "NP", "name" => "Nepal"],
            ["code" => "NL", "name" => "Netherlands"],
            ["code" => "AN", "name" => "Netherlands Antilles"],
            ["code" => "NC", "name" => "New Caledonia"],
            ["code" => "NZ", "name" => "New Zealand"],
            ["code" => "NI", "name" => "Nicaragua"],
            ["code" => "NE", "name" => "Niger"],
            ["code" => "NG", "name" => "Nigeria"],
            ["code" => "NU", "name" => "Niue"],
            ["code" => "NF", "name" => "Norfolk Island"],
            ["code" => "MP", "name" => "Northern Mariana Islands"],
            ["code" => "NO", "name" => "Norway"],
            ["code" => "OM", "name" => "Oman"],
            ["code" => "PK", "name" => "Pakistan"],
            ["code" => "PW", "name" => "Palau"],
            ["code" => "PA", "name" => "Panama"],
            ["code" => "PG", "name" => "Papua New Guinea"],
            ["code" => "PY", "name" => "Paraguay"],
            ["code" => "PE", "name" => "Peru"],
            ["code" => "PH", "name" => "Philippines"],
            ["code" => "PN", "name" => "Pitcairn"],
            ["code" => "PL", "name" => "Poland"],
            ["code" => "PT", "name" => "Portugal"],
            ["code" => "PR", "name" => "Puerto Rico"],
            ["code" => "QA", "name" => "Qatar"],
            ["code" => "RE", "name" => "Reunion"],
            ["code" => "RO", "name" => "Romania"],
            ["code" => "RU", "name" => "Russian Federation"],
            ["code" => "RW", "name" => "Rwanda"],
            ["code" => "SH", "name" => "St. Helena"],
            ["code" => "KN", "name" => "Saint Kitts & Nevis"],
            ["code" => "LC", "name" => "Saint Lucia"],
            ["code" => "PM", "name" => "St. Pierre & Miquelon"],
            ["code" => "VC", "name" => "St. Vincent & the Grenadines"],
            ["code" => "WS", "name" => "Samoa"],
            ["code" => "SM", "name" => "San Marino"],
            ["code" => "ST", "name" => "Sao Tome & Principe"],
            ["code" => "SA", "name" => "Saudi Arabia"],
            ["code" => "SN", "name" => "Senegal"],
            ["code" => "SC", "name" => "Seychelles"],
            ["code" => "SL", "name" => "Sierra Leone"],
            ["code" => "SG", "name" => "Singapore"],
            ["code" => "SK", "name" => "Slovak Republic"],
            ["code" => "SI", "name" => "Slovenia"],
            ["code" => "SB", "name" => "Solomon Islands"],
            ["code" => "SO", "name" => "Somalia"],
            ["code" => "ZA", "name" => "South Africa"],
            ["code" => "GS", "name" => "S.Georgia & S.Sandwich Islands"],
            ["code" => "ES", "name" => "Spain"],
            ["code" => "LK", "name" => "Sri Lanka"],
            ["code" => "SD", "name" => "Sudan"],
            ["code" => "SR", "name" => "Suriname"],
            ["code" => "SJ", "name" => "Svalbard & Jan Mayen Islands"],
            ["code" => "SZ", "name" => "Swaziland"],
            ["code" => "SE", "name" => "Sweden"],
            ["code" => "CH", "name" => "Switzerland"],
            ["code" => "SY", "name" => "Syria"],
            ["code" => "TW", "name" => "Taiwan"],
            ["code" => "TJ", "name" => "Tajikistan"],
            ["code" => "TZ", "name" => "Tanzania"],
            ["code" => "TH", "name" => "Thailand"],
            ["code" => "TG", "name" => "Togo"],
            ["code" => "TK", "name" => "Tokelau"],
            ["code" => "TO", "name" => "Tonga"],
            ["code" => "TT", "name" => "Trinidad & Tobago"],
            ["code" => "TN", "name" => "Tunisia"],
            ["code" => "TR", "name" => "Turkey"],
            ["code" => "TM", "name" => "Turkmenistan"],
            ["code" => "TC", "name" => "Turks & Caicos Islands"],
            ["code" => "TV", "name" => "Tuvalu"],
            ["code" => "UG", "name" => "Uganda"],
            ["code" => "UA", "name" => "Ukraine"],
            ["code" => "AE", "name" => "United Arab Emirates"],
            ["code" => "UY", "name" => "Uruguay"],
            ["code" => "UZ", "name" => "Uzbekistan"],
            ["code" => "VU", "name" => "Vanuatu"],
            ["code" => "VE", "name" => "Venezuela"],
            ["code" => "VN", "name" => "Viet Nam"],
            ["code" => "VG", "name" => "Virgin Islands (British)"],
            ["code" => "VI", "name" => "Virgin Islands (U.S.)"],
            ["code" => "WF", "name" => "Wallis & Futuna Islands"],
            ["code" => "EH", "name" => "Western Sahara"],
            ["code" => "YE", "name" => "Yemen"],
            ["code" => "YU", "name" => "Yugoslavia"],
            ["code" => "ZM", "name" => "Zambia"],
            ["code" => "ZW", "name" => "Zimbabwe"]
        ];

        return $country_list;
    }

    public static function getCountryList(): array
    {
        $countryList = [
            ["key" => 'United States', "text" => 'United States'],
            ["key" => 'United States Minor Outlying Islands', "text" => 'United States Minor Outlying Islands'],
            ["key" => 'Afghanistan', "text" => 'Afghanistan'],
            ["key" => 'Åland', "text" => 'Åland'],
            ["key" => 'Albania', "text" => 'Albania'],
            ["key" => 'Algeria', "text" => 'Algeria'],
            ["key" => 'American Samoa', "text" => 'American Samoa'],
            ["key" => 'Andorra', "text" => 'Andorra'],
            ["key" => 'Angola', "text" => 'Angola'],
            ["key" => 'Anguilla', "text" => 'Anguilla'],
            ["key" => 'Antarctica', "text" => 'Antarctica'],
            ["key" => 'Antigua and Barbuda', "text" => 'Antigua and Barbuda'],
            ["key" => 'Argentina', "text" => 'Argentina'],
            ["key" => 'Armenia', "text" => 'Armenia'],
            ["key" => 'Aruba', "text" => 'Aruba'],
            ["key" => 'Australia', "text" => 'Australia'],
            ["key" => 'Austria', "text" => 'Austria'],
            ["key" => 'Azerbaijan', "text" => 'Azerbaijan'],
            ["key" => 'Bahamas', "text" => 'Bahamas'],
            ["key" => 'Bahrain', "text" => 'Bahrain'],
            ["key" => 'Bangladesh', "text" => 'Bangladesh'],
            ["key" => 'Barbados', "text" => 'Barbados'],
            ["key" => 'Belarus', "text" => 'Belarus'],
            ["key" => 'Belgium', "text" => 'Belgium'],
            ["key" => 'Belize', "text" => 'Belize'],
            ["key" => 'Benin', "text" => 'Benin'],
            ["key" => 'Bermuda', "text" => 'Bermuda'],
            ["key" => 'Bhutan', "text" => 'Bhutan'],
            ["key" => 'Bolivia', "text" => 'Bolivia'],
            ["key" => 'Bonaire, Sint Eustatius and Saba', "text" => 'Bonaire, Sint Eustatius and Saba'],
            ["key" => 'Bosnia and Herzegovina', "text" => 'Bosnia and Herzegovina'],
            ["key" => 'Botswana', "text" => 'Botswana'],
            ["key" => 'Bouvet Island', "text" => 'Bouvet Island'],
            ["key" => 'Brazil', "text" => 'Brazil'],
            ["key" => 'British Indian Ocean Territory', "text" => 'British Indian Ocean Territory'],
            ["key" => 'Brunei Darussalam', "text" => 'Brunei Darussalam'],
            ["key" => 'Bulgaria', "text" => 'Bulgaria'],
            ["key" => 'Burkina Faso', "text" => 'Burkina Faso'],
            ["key" => 'Burundi', "text" => 'Burundi'],
            ["key" => 'Cambodia', "text" => 'Cambodia'],
            ["key" => 'Cameroon', "text" => 'Cameroon'],
            ["key" => 'Canada', "text" => 'Canada'],
            ["key" => 'Cape Verde', "text" => 'Cape Verde'],
            ["key" => 'Cayman Islands', "text" => 'Cayman Islands'],
            ["key" => 'Central African Republic', "text" => 'Central African Republic'],
            ["key" => 'Chad', "text" => 'Chad'],
            ["key" => 'Chile', "text" => 'Chile'],
            ["key" => 'China', "text" => 'China'],
            ["key" => 'Christmas Island', "text" => 'Christmas Island'],
            ["key" => 'Cocos (Keeling) Islands', "text" => 'Cocos (Keeling) Islands'],
            ["key" => 'Colombia', "text" => 'Colombia'],
            ["key" => 'Comoros', "text" => 'Comoros'],
            ["key" => 'Congo (Brazzaville)', "text" => 'Congo (Brazzaville)'],
            ["key" => 'Congo (Kinshasa)', "text" => 'Congo (Kinshasa)'],
            ["key" => 'Cook Islands', "text" => 'Cook Islands'],
            ["key" => 'Costa Rica', "text" => 'Costa Rica'],
            ["key" => "Côte d'Ivoire", "text" => "Côte d'Ivoire"],
            ["key" => 'Croatia', "text" => 'Croatia'],
            ["key" => 'Cuba', "text" => 'Cuba'],
            ["key" => 'Curaçao', "text" => 'Curaçao'],
            ["key" => 'Cyprus', "text" => 'Cyprus'],
            ["key" => 'Czech Republic', "text" => 'Czech Republic'],
            ["key" => 'Denmark', "text" => 'Denmark'],
            ["key" => 'Djibouti', "text" => 'Djibouti'],
            ["key" => 'Dominica', "text" => 'Dominica'],
            ["key" => 'Dominican Republic', "text" => 'Dominican Republic'],
            ["key" => 'Ecuador', "text" => 'Ecuador'],
            ["key" => 'Egypt', "text" => 'Egypt'],
            ["key" => 'El Salvador', "text" => 'El Salvador'],
            ["key" => 'Equatorial Guinea', "text" => 'Equatorial Guinea'],
            ["key" => 'Eritrea', "text" => 'Eritrea'],
            ["key" => 'Estonia', "text" => 'Estonia'],
            ["key" => 'Ethiopia', "text" => 'Ethiopia'],
            ["key" => 'Falkland Islands', "text" => 'Falkland Islands'],
            ["key" => 'Faroe Islands', "text" => 'Faroe Islands'],
            ["key" => 'Fiji', "text" => 'Fiji'],
            ["key" => 'Finland', "text" => 'Finland'],
            ["key" => 'France', "text" => 'France'],
            ["key" => 'French Guiana', "text" => 'French Guiana'],
            ["key" => 'French Polynesia', "text" => 'French Polynesia'],
            ["key" => 'French Southern Lands', "text" => 'French Southern Lands'],
            ["key" => 'Gabon', "text" => 'Gabon'],
            ["key" => 'Gambia', "text" => 'Gambia'],
            ["key" => 'Georgia', "text" => 'Georgia'],
            ["key" => 'Germany', "text" => 'Germany'],
            ["key" => 'Ghana', "text" => 'Ghana'],
            ["key" => 'Gibraltar', "text" => 'Gibraltar'],
            ["key" => 'Greece', "text" => 'Greece'],
            ["key" => 'Greenland', "text" => 'Greenland'],
            ["key" => 'Grenada', "text" => 'Grenada'],
            ["key" => 'Guadeloupe', "text" => 'Guadeloupe'],
            ["key" => 'Guam', "text" => 'Guam'],
            ["key" => 'Guatemala', "text" => 'Guatemala'],
            ["key" => 'Guernsey', "text" => 'Guernsey'],
            ["key" => 'Guinea', "text" => 'Guinea'],
            ["key" => 'Guinea-Bissau', "text" => 'Guinea-Bissau'],
            ["key" => 'Guyana', "text" => 'Guyana'],
            ["key" => 'Haiti', "text" => 'Haiti'],
            ["key" => 'Heard and McDonald Islands', "text" => 'Heard and McDonald Islands'],
            ["key" => 'Honduras', "text" => 'Honduras'],
            ["key" => 'Hong Kong', "text" => 'Hong Kong'],
            ["key" => 'Hungary', "text" => 'Hungary'],
            ["key" => 'Iceland', "text" => 'Iceland'],
            ["key" => 'India', "text" => 'India'],
            ["key" => 'Indonesia', "text" => 'Indonesia'],
            ["key" => 'Iran', "text" => 'Iran'],
            ["key" => 'Iraq', "text" => 'Iraq'],
            ["key" => 'Ireland', "text" => 'Ireland'],
            ["key" => 'Isle of Man', "text" => 'Isle of Man'],
            ["key" => 'Israel', "text" => 'Israel'],
            ["key" => 'Italy', "text" => 'Italy'],
            ["key" => 'Jamaica', "text" => 'Jamaica'],
            ["key" => 'Japan', "text" => 'Japan'],
            ["key" => 'Jersey', "text" => 'Jersey'],
            ["key" => 'Jordan', "text" => 'Jordan'],
            ["key" => 'Kazakhstan', "text" => 'Kazakhstan'],
            ["key" => 'Kenya', "text" => 'Kenya'],
            ["key" => 'Kiribati', "text" => 'Kiribati'],
            ["key" => 'Korea, North', "text" => 'Korea, North'],
            ["key" => 'Korea, South', "text" => 'Korea, South'],
            ["key" => 'Kuwait', "text" => 'Kuwait'],
            ["key" => 'Kyrgyzstan', "text" => 'Kyrgyzstan'],
            ["key" => 'Laos', "text" => 'Laos'],
            ["key" => 'Latvia', "text" => 'Latvia'],
            ["key" => 'Lebanon', "text" => 'Lebanon'],
            ["key" => 'Lesotho', "text" => 'Lesotho'],
            ["key" => 'Liberia', "text" => 'Liberia'],
            ["key" => 'Libya', "text" => 'Libya'],
            ["key" => 'Liechtenstein', "text" => 'Liechtenstein'],
            ["key" => 'Lithuania', "text" => 'Lithuania'],
            ["key" => 'Luxembourg', "text" => 'Luxembourg'],
            ["key" => 'Macau', "text" => 'Macau'],
            ["key" => 'Macedonia', "text" => 'Macedonia'],
            ["key" => 'Madagascar', "text" => 'Madagascar'],
            ["key" => 'Malawi', "text" => 'Malawi'],
            ["key" => 'Malaysia', "text" => 'Malaysia'],
            ["key" => 'Maldives', "text" => 'Maldives'],
            ["key" => 'Mali', "text" => 'Mali'],
            ["key" => 'Malta', "text" => 'Malta'],
            ["key" => 'Marshall Islands', "text" => 'Marshall Islands'],
            ["key" => 'Martinique', "text" => 'Martinique'],
            ["key" => 'Mauritania', "text" => 'Mauritania'],
            ["key" => 'Mauritius', "text" => 'Mauritius'],
            ["key" => 'Mayotte', "text" => 'Mayotte'],
            ["key" => 'Mexico', "text" => 'Mexico'],
            ["key" => 'Micronesia', "text" => 'Micronesia'],
            ["key" => 'Moldova', "text" => 'Moldova'],
            ["key" => 'Monaco', "text" => 'Monaco'],
            ["key" => 'Mongolia', "text" => 'Mongolia'],
            ["key" => 'Montenegro', "text" => 'Montenegro'],
            ["key" => 'Montserrat', "text" => 'Montserrat'],
            ["key" => 'Morocco', "text" => 'Morocco'],
            ["key" => 'Mozambique', "text" => 'Mozambique'],
            ["key" => 'Myanmar', "text" => 'Myanmar'],
            ["key" => 'Namibia', "text" => 'Namibia'],
            ["key" => 'Nauru', "text" => 'Nauru'],
            ["key" => 'Nepal', "text" => 'Nepal'],
            ["key" => 'Netherlands', "text" => 'Netherlands'],
            ["key" => 'New Caledonia', "text" => 'New Caledonia'],
            ["key" => 'New Zealand', "text" => 'New Zealand'],
            ["key" => 'Nicaragua', "text" => 'Nicaragua'],
            ["key" => 'Niger', "text" => 'Niger'],
            ["key" => 'Nigeria', "text" => 'Nigeria'],
            ["key" => 'Niue', "text" => 'Niue'],
            ["key" => 'Norfolk Island', "text" => 'Norfolk Island'],
            ["key" => 'Northern Mariana Islands', "text" => 'Northern Mariana Islands'],
            ["key" => 'Norway', "text" => 'Norway'],
            ["key" => 'Oman', "text" => 'Oman'],
            ["key" => 'Pakistan', "text" => 'Pakistan'],
            ["key" => 'Palau', "text" => 'Palau'],
            ["key" => 'Palestine', "text" => 'Palestine'],
            ["key" => 'Panama', "text" => 'Panama'],
            ["key" => 'Papua New Guinea', "text" => 'Papua New Guinea'],
            ["key" => 'Paraguay', "text" => 'Paraguay'],
            ["key" => 'Peru', "text" => 'Peru'],
            ["key" => 'Philippines', "text" => 'Philippines'],
            ["key" => 'Pitcairn', "text" => 'Pitcairn'],
            ["key" => 'Poland', "text" => 'Poland'],
            ["key" => 'Portugal', "text" => 'Portugal'],
            ["key" => 'Puerto Rico', "text" => 'Puerto Rico'],
            ["key" => 'Qatar', "text" => 'Qatar'],
            ["key" => 'Reunion', "text" => 'Reunion'],
            ["key" => 'Romania', "text" => 'Romania'],
            ["key" => 'Russian Federation', "text" => 'Russian Federation'],
            ["key" => 'Rwanda', "text" => 'Rwanda'],
            ["key" => 'Saint Barthélemy', "text" => 'Saint Barthélemy'],
            ["key" => 'Saint Helena', "text" => 'Saint Helena'],
            ["key" => 'Saint Kitts and Nevis', "text" => 'Saint Kitts and Nevis'],
            ["key" => 'Saint Lucia', "text" => 'Saint Lucia'],
            ["key" => 'Saint Martin (French part)', "text" => 'Saint Martin (French part)'],
            ["key" => 'Saint Pierre and Miquelon', "text" => 'Saint Pierre and Miquelon'],
            ["key" => 'Saint Vincent and the Grenadines', "text" => 'Saint Vincent and the Grenadines'],
            ["key" => 'Samoa', "text" => 'Samoa'],
            ["key" => 'San Marino', "text" => 'San Marino'],
            ["key" => 'Sao Tome and Principe', "text" => 'Sao Tome and Principe'],
            ["key" => 'Saudi Arabia', "text" => 'Saudi Arabia'],
            ["key" => 'Senegal', "text" => 'Senegal'],
            ["key" => 'Serbia', "text" => 'Serbia'],
            ["key" => 'Seychelles', "text" => 'Seychelles'],
            ["key" => 'Sierra Leone', "text" => 'Sierra Leone'],
            ["key" => 'Singapore', "text" => 'Singapore'],
            ["key" => 'Sint Maarten (Dutch part)', "text" => 'Sint Maarten (Dutch part)'],
            ["key" => 'Slovakia', "text" => 'Slovakia'],
            ["key" => 'Slovenia', "text" => 'Slovenia'],
            ["key" => 'Solomon Islands', "text" => 'Solomon Islands'],
            ["key" => 'Somalia', "text" => 'Somalia'],
            ["key" => 'South Africa', "text" => 'South Africa'],
            ["key" => 'South Georgia and South Sandwich Islands', "text" => 'South Georgia and South Sandwich Islands'],
            ["key" => 'South Sudan', "text" => 'South Sudan'],
            ["key" => 'Spain', "text" => 'Spain'],
            ["key" => 'Sri Lanka', "text" => 'Sri Lanka'],
            ["key" => 'Sudan', "text" => 'Sudan'],
            ["key" => 'Suriname', "text" => 'Suriname'],
            ["key" => 'Svalbard and Jan Mayen Islands', "text" => 'Svalbard and Jan Mayen Islands'],
            ["key" => 'Swaziland', "text" => 'Swaziland'],
            ["key" => 'Sweden', "text" => 'Sweden'],
            ["key" => 'Switzerland', "text" => 'Switzerland'],
            ["key" => 'Syria', "text" => 'Syria'],
            ["key" => 'Taiwan', "text" => 'Taiwan'],
            ["key" => 'Tajikistan', "text" => 'Tajikistan'],
            ["key" => 'Tanzania', "text" => 'Tanzania'],
            ["key" => 'Thailand', "text" => 'Thailand'],
            ["key" => 'Timor-Leste', "text" => 'Timor-Leste'],
            ["key" => 'Togo', "text" => 'Togo'],
            ["key" => 'Tokelau', "text" => 'Tokelau'],
            ["key" => 'Tonga', "text" => 'Tonga'],
            ["key" => 'Trinidad and Tobago', "text" => 'Trinidad and Tobago'],
            ["key" => 'Tunisia', "text" => 'Tunisia'],
            ["key" => 'Turkey', "text" => 'Turkey'],
            ["key" => 'Turkmenistan', "text" => 'Turkmenistan'],
            ["key" => 'Turks and Caicos Islands', "text" => 'Turks and Caicos Islands'],
            ["key" => 'Tuvalu', "text" => 'Tuvalu'],
            ["key" => 'Uganda', "text" => 'Uganda'],
            ["key" => 'Ukraine', "text" => 'Ukraine'],
            ["key" => 'United Arab Emirates', "text" => 'United Arab Emirates'],
            ["key" => 'United Kingdom', "text" => 'United Kingdom'],
            ["key" => 'Uruguay', "text" => 'Uruguay'],
            ["key" => 'Uzbekistan', "text" => 'Uzbekistan'],
            ["key" => 'Vanuatu', "text" => 'Vanuatu'],
            ["key" => 'Vatican City', "text" => 'Vatican City'],
            ["key" => 'Venezuela', "text" => 'Venezuela'],
            ["key" => 'Vietnam', "text" => 'Vietnam'],
            ["key" => 'Virgin Islands, British', "text" => 'Virgin Islands, British'],
            ["key" => 'Virgin Islands, U.S.', "text" => 'Virgin Islands, U.S.'],
            ["key" => 'Wallis and Futuna Islands', "text" => 'Wallis and Futuna Islands'],
            ["key" => 'Western Sahara', "text" => 'Western Sahara'],
            ["key" => 'Yemen', "text" => 'Yemen'],
            ["key" => 'Zambia', "text" => 'Zambia'],
            ["key" => 'Zimbabwe', "text" => 'Zimbabwe']
        ];

        return $countryList;
    }

    /**
     * Helper method to get the number of runs of a test to enforce limits
     *
     * Pass in a name
     */
    public static function getRunCount($runs, $fvonly, $lighthouse, $testtype): int
    {
        $runcount = max(1, $runs);
        $multiplier = $fvonly ? 1 : 2;
        $total_runs = $runcount * $multiplier;
        return $total_runs;
    }

    /**
     * This is used to determine which hosts don't get counted in test runs
     */
    public static function getExemptHost(?string $default = ""): string
    {
        return self::getSetting('exempt_from_test_run_count_host', $default);
    }

    /**
     * This grabs a big json file full of ISO 3166 compliant countries and their subdivisions
     */
    public static function getCountryJsonBlob(): string
    {
        $file = file_get_contents(ASSETS_PATH . '/js/country-list/country-list.json');

        return $file;
    }
    /**
     * gets a plan by it's id if you pass it an array of plans
     */
    public static function getPlanFromArray(string $id, PlanList $plans): Plan
    {
        foreach ($plans as $plan) {
            $planId = $plan->getId();
            if (strtolower($planId) == strtolower($id)) {
                return $plan;
            }
        }
    }
    /**
     * Set a message in session storage to be accessed in the UI
     * @param $message_type string  - example is something like FORM, ACCOUNT, TESTING  to handle styling different
     * types of messaging, currently only used for form notifications
     * @param $message array
     * @param $message.type string error|success|warning|info
     * @param $message.text string
     *
     * $formBannerMessage = array(
     *  'type' => 'success',
     * 'text' => 'Your plan has successfully been updated!');
     * Util::setBannerMessage('form', $formBannerMessage);
     */
    public static function setBannerMessage(string $message_type, array $message): void
    {
        if (self::getSetting('php_sessions')) {
            $_SESSION['messages'][$message_type][] = $message;
        }
    }

    /**
     * GET all messages in session storage and clear messages
     *
     */
    public static function getBannerMessage(): array
    {
        if (!self::getSetting('php_sessions')) {
            return [];
        }

        $messages_array = isset($_SESSION['messages']) ? $_SESSION['messages'] : [];
        unset($_SESSION['messages']);
        return $messages_array;
    }

    public static function getAnnualPlanByRuns(int $runs, array $annualPlans): Plan
    {
        foreach ($annualPlans as $plan) {
            $planRuns = $plan->getRuns();
            if ($planRuns == $runs) {
                return $plan;
                exit();
            }
        }
    }
}
