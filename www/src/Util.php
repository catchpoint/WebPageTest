<?php

declare(strict_types=1);

namespace WebPageTest;

use WebPageTest\Util\Cache;

class Util
{
    private static array $SETTINGS = [];
    private const SETTINGS_KEY = 'settings';
    private static string $settings_dir = __DIR__ . '/../settings';

    public function __construct()
    {
        throw new \Exception("Util should not be instantiated. It only has static methods.");
    }

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

    public static function getCountryList(): array
    {

        $countryList = array(
        array( "key" => 'United States', "text" => 'United States'),
        array( "key" => 'United States Minor Outlying Islands', "text" => 'United States Minor Outlying Islands'),
        array( "key" => 'Afghanistan', "text" => 'Afghanistan'),
        array( "key" => 'Åland', "text" => 'Åland'),
        array( "key" => 'Albania', "text" => 'Albania'),
        array( "key" => 'Algeria', "text" => 'Algeria'),
        array( "key" => 'American Samoa', "text" => 'American Samoa'),
        array( "key" => 'Andorra', "text" => 'Andorra'),
        array( "key" => 'Angola', "text" => 'Angola'),
        array( "key" => 'Anguilla', "text" => 'Anguilla'),
        array( "key" => 'Antarctica', "text" => 'Antarctica'),
        array( "key" => 'Antigua and Barbuda', "text" => 'Antigua and Barbuda'),
        array( "key" => 'Argentina', "text" => 'Argentina'),
        array( "key" => 'Armenia', "text" => 'Armenia'),
        array( "key" => 'Aruba', "text" => 'Aruba'),
        array( "key" => 'Australia', "text" => 'Australia'),
        array( "key" => 'Austria', "text" => 'Austria'),
        array( "key" => 'Azerbaijan', "text" => 'Azerbaijan'),
        array( "key" => 'Bahamas', "text" => 'Bahamas'),
        array( "key" => 'Bahrain', "text" => 'Bahrain'),
        array( "key" => 'Bangladesh', "text" => 'Bangladesh'),
        array( "key" => 'Barbados', "text" => 'Barbados'),
        array( "key" => 'Belarus', "text" => 'Belarus'),
        array( "key" => 'Belgium', "text" => 'Belgium'),
        array( "key" => 'Belize', "text" => 'Belize'),
        array( "key" => 'Benin', "text" => 'Benin'),
        array( "key" => 'Bermuda', "text" => 'Bermuda'),
        array( "key" => 'Bhutan', "text" => 'Bhutan'),
        array( "key" => 'Bolivia', "text" => 'Bolivia'),
        array( "key" => 'Bonaire, Sint Eustatius and Saba', "text" => 'Bonaire, Sint Eustatius and Saba'),
        array( "key" => 'Bosnia and Herzegovina', "text" => 'Bosnia and Herzegovina'),
        array( "key" => 'Botswana', "text" => 'Botswana'),
        array( "key" => 'Bouvet Island', "text" => 'Bouvet Island'),
        array( "key" => 'Brazil', "text" => 'Brazil'),
        array( "key" => 'British Indian Ocean Territory', "text" => 'British Indian Ocean Territory'),
        array( "key" => 'Brunei Darussalam', "text" => 'Brunei Darussalam'),
        array( "key" => 'Bulgaria', "text" => 'Bulgaria'),
        array( "key" => 'Burkina Faso', "text" => 'Burkina Faso'),
        array( "key" => 'Burundi', "text" => 'Burundi'),
        array( "key" => 'Cambodia', "text" => 'Cambodia'),
        array( "key" => 'Cameroon', "text" => 'Cameroon'),
        array( "key" => 'Canada', "text" => 'Canada'),
        array( "key" => 'Cape Verde', "text" => 'Cape Verde'),
        array( "key" => 'Cayman Islands', "text" => 'Cayman Islands'),
        array( "key" => 'Central African Republic', "text" => 'Central African Republic'),
        array( "key" => 'Chad', "text" => 'Chad'),
        array( "key" => 'Chile', "text" => 'Chile'),
        array( "key" => 'China', "text" => 'China'),
        array( "key" => 'Christmas Island', "text" => 'Christmas Island'),
        array( "key" => 'Cocos (Keeling) Islands', "text" => 'Cocos (Keeling) Islands'),
        array( "key" => 'Colombia', "text" => 'Colombia'),
        array( "key" => 'Comoros', "text" => 'Comoros'),
        array( "key" => 'Congo (Brazzaville)', "text" => 'Congo (Brazzaville)'),
        array( "key" => 'Congo (Kinshasa)', "text" => 'Congo (Kinshasa)'),
        array( "key" => 'Cook Islands', "text" => 'Cook Islands'),
        array( "key" => 'Costa Rica', "text" => 'Costa Rica'),
        array( "key" => "Côte d'Ivoire", "text" => "Côte d'Ivoire"),
        array( "key" => 'Croatia', "text" => 'Croatia'),
        array( "key" => 'Cuba', "text" => 'Cuba'),
        array( "key" => 'Curaçao', "text" => 'Curaçao'),
        array( "key" => 'Cyprus', "text" => 'Cyprus'),
        array( "key" => 'Czech Republic', "text" => 'Czech Republic'),
        array( "key" => 'Denmark', "text" => 'Denmark'),
        array( "key" => 'Djibouti', "text" => 'Djibouti'),
        array( "key" => 'Dominica', "text" => 'Dominica'),
        array( "key" => 'Dominican Republic', "text" => 'Dominican Republic'),
        array( "key" => 'Ecuador', "text" => 'Ecuador'),
        array( "key" => 'Egypt', "text" => 'Egypt'),
        array( "key" => 'El Salvador', "text" => 'El Salvador'),
        array( "key" => 'Equatorial Guinea', "text" => 'Equatorial Guinea'),
        array( "key" => 'Eritrea', "text" => 'Eritrea'),
        array( "key" => 'Estonia', "text" => 'Estonia'),
        array( "key" => 'Ethiopia', "text" => 'Ethiopia'),
        array( "key" => 'Falkland Islands', "text" => 'Falkland Islands'),
        array( "key" => 'Faroe Islands', "text" => 'Faroe Islands'),
        array( "key" => 'Fiji', "text" => 'Fiji'),
        array( "key" => 'Finland', "text" => 'Finland'),
        array( "key" => 'France', "text" => 'France'),
        array( "key" => 'French Guiana', "text" => 'French Guiana'),
        array( "key" => 'French Polynesia', "text" => 'French Polynesia'),
        array( "key" => 'French Southern Lands', "text" => 'French Southern Lands'),
        array( "key" => 'Gabon', "text" => 'Gabon'),
        array( "key" => 'Gambia', "text" => 'Gambia'),
        array( "key" => 'Georgia', "text" => 'Georgia'),
        array( "key" => 'Germany', "text" => 'Germany'),
        array( "key" => 'Ghana', "text" => 'Ghana'),
        array( "key" => 'Gibraltar', "text" => 'Gibraltar'),
        array( "key" => 'Greece', "text" => 'Greece'),
        array( "key" => 'Greenland', "text" => 'Greenland'),
        array( "key" => 'Grenada', "text" => 'Grenada'),
        array( "key" => 'Guadeloupe', "text" => 'Guadeloupe'),
        array( "key" => 'Guam', "text" => 'Guam'),
        array( "key" => 'Guatemala', "text" => 'Guatemala'),
        array( "key" => 'Guernsey', "text" => 'Guernsey'),
        array( "key" => 'Guinea', "text" => 'Guinea'),
        array( "key" => 'Guinea-Bissau', "text" => 'Guinea-Bissau'),
        array( "key" => 'Guyana', "text" => 'Guyana'),
        array( "key" => 'Haiti', "text" => 'Haiti'),
        array( "key" => 'Heard and McDonald Islands', "text" => 'Heard and McDonald Islands'),
        array( "key" => 'Honduras', "text" => 'Honduras'),
        array( "key" => 'Hong Kong', "text" => 'Hong Kong'),
        array( "key" => 'Hungary', "text" => 'Hungary'),
        array( "key" => 'Iceland', "text" => 'Iceland'),
        array( "key" => 'India', "text" => 'India'),
        array( "key" => 'Indonesia', "text" => 'Indonesia'),
        array( "key" => 'Iran', "text" => 'Iran'),
        array( "key" => 'Iraq', "text" => 'Iraq'),
        array( "key" => 'Ireland', "text" => 'Ireland'),
        array( "key" => 'Isle of Man', "text" => 'Isle of Man'),
        array( "key" => 'Israel', "text" => 'Israel'),
        array( "key" => 'Italy', "text" => 'Italy'),
        array( "key" => 'Jamaica', "text" => 'Jamaica'),
        array( "key" => 'Japan', "text" => 'Japan'),
        array( "key" => 'Jersey', "text" => 'Jersey'),
        array( "key" => 'Jordan', "text" => 'Jordan'),
        array( "key" => 'Kazakhstan', "text" => 'Kazakhstan'),
        array( "key" => 'Kenya', "text" => 'Kenya'),
        array( "key" => 'Kiribati', "text" => 'Kiribati'),
        array( "key" => 'Korea, North', "text" => 'Korea, North'),
        array( "key" => 'Korea, South', "text" => 'Korea, South'),
        array( "key" => 'Kuwait', "text" => 'Kuwait'),
        array( "key" => 'Kyrgyzstan', "text" => 'Kyrgyzstan'),
        array( "key" => 'Laos', "text" => 'Laos'),
        array( "key" => 'Latvia', "text" => 'Latvia'),
        array( "key" => 'Lebanon', "text" => 'Lebanon'),
        array( "key" => 'Lesotho', "text" => 'Lesotho'),
        array( "key" => 'Liberia', "text" => 'Liberia'),
        array( "key" => 'Libya', "text" => 'Libya'),
        array( "key" => 'Liechtenstein', "text" => 'Liechtenstein'),
        array( "key" => 'Lithuania', "text" => 'Lithuania'),
        array( "key" => 'Luxembourg', "text" => 'Luxembourg'),
        array( "key" => 'Macau', "text" => 'Macau'),
        array( "key" => 'Macedonia', "text" => 'Macedonia'),
        array( "key" => 'Madagascar', "text" => 'Madagascar'),
        array( "key" => 'Malawi', "text" => 'Malawi'),
        array( "key" => 'Malaysia', "text" => 'Malaysia'),
        array( "key" => 'Maldives', "text" => 'Maldives'),
        array( "key" => 'Mali', "text" => 'Mali'),
        array( "key" => 'Malta', "text" => 'Malta'),
        array( "key" => 'Marshall Islands', "text" => 'Marshall Islands'),
        array( "key" => 'Martinique', "text" => 'Martinique'),
        array( "key" => 'Mauritania', "text" => 'Mauritania'),
        array( "key" => 'Mauritius', "text" => 'Mauritius'),
        array( "key" => 'Mayotte', "text" => 'Mayotte'),
        array( "key" => 'Mexico', "text" => 'Mexico'),
        array( "key" => 'Micronesia', "text" => 'Micronesia'),
        array( "key" => 'Moldova', "text" => 'Moldova'),
        array( "key" => 'Monaco', "text" => 'Monaco'),
        array( "key" => 'Mongolia', "text" => 'Mongolia'),
        array( "key" => 'Montenegro', "text" => 'Montenegro'),
        array( "key" => 'Montserrat', "text" => 'Montserrat'),
        array( "key" => 'Morocco', "text" => 'Morocco'),
        array( "key" => 'Mozambique', "text" => 'Mozambique'),
        array( "key" => 'Myanmar', "text" => 'Myanmar'),
        array( "key" => 'Namibia', "text" => 'Namibia'),
        array( "key" => 'Nauru', "text" => 'Nauru'),
        array( "key" => 'Nepal', "text" => 'Nepal'),
        array( "key" => 'Netherlands', "text" => 'Netherlands'),
        array( "key" => 'New Caledonia', "text" => 'New Caledonia'),
        array( "key" => 'New Zealand', "text" => 'New Zealand'),
        array( "key" => 'Nicaragua', "text" => 'Nicaragua'),
        array( "key" => 'Niger', "text" => 'Niger'),
        array( "key" => 'Nigeria', "text" => 'Nigeria'),
        array( "key" => 'Niue', "text" => 'Niue'),
        array( "key" => 'Norfolk Island', "text" => 'Norfolk Island'),
        array( "key" => 'Northern Mariana Islands', "text" => 'Northern Mariana Islands'),
        array( "key" => 'Norway', "text" => 'Norway'),
        array( "key" => 'Oman', "text" => 'Oman'),
        array( "key" => 'Pakistan', "text" => 'Pakistan'),
        array( "key" => 'Palau', "text" => 'Palau'),
        array( "key" => 'Palestine', "text" => 'Palestine'),
        array( "key" => 'Panama', "text" => 'Panama'),
        array( "key" => 'Papua New Guinea', "text" => 'Papua New Guinea'),
        array( "key" => 'Paraguay', "text" => 'Paraguay'),
        array( "key" => 'Peru', "text" => 'Peru'),
        array( "key" => 'Philippines', "text" => 'Philippines'),
        array( "key" => 'Pitcairn', "text" => 'Pitcairn'),
        array( "key" => 'Poland', "text" => 'Poland'),
        array( "key" => 'Portugal', "text" => 'Portugal'),
        array( "key" => 'Puerto Rico', "text" => 'Puerto Rico'),
        array( "key" => 'Qatar', "text" => 'Qatar'),
        array( "key" => 'Reunion', "text" => 'Reunion'),
        array( "key" => 'Romania', "text" => 'Romania'),
        array( "key" => 'Russian Federation', "text" => 'Russian Federation'),
        array( "key" => 'Rwanda', "text" => 'Rwanda'),
        array( "key" => 'Saint Barthélemy', "text" => 'Saint Barthélemy'),
        array( "key" => 'Saint Helena', "text" => 'Saint Helena'),
        array( "key" => 'Saint Kitts and Nevis', "text" => 'Saint Kitts and Nevis'),
        array( "key" => 'Saint Lucia', "text" => 'Saint Lucia'),
        array( "key" => 'Saint Martin (French part)', "text" => 'Saint Martin (French part)'),
        array( "key" => 'Saint Pierre and Miquelon', "text" => 'Saint Pierre and Miquelon'),
        array( "key" => 'Saint Vincent and the Grenadines', "text" => 'Saint Vincent and the Grenadines'),
        array( "key" => 'Samoa', "text" => 'Samoa'),
        array( "key" => 'San Marino', "text" => 'San Marino'),
        array( "key" => 'Sao Tome and Principe', "text" => 'Sao Tome and Principe'),
        array( "key" => 'Saudi Arabia', "text" => 'Saudi Arabia'),
        array( "key" => 'Senegal', "text" => 'Senegal'),
        array( "key" => 'Serbia', "text" => 'Serbia'),
        array( "key" => 'Seychelles', "text" => 'Seychelles'),
        array( "key" => 'Sierra Leone', "text" => 'Sierra Leone'),
        array( "key" => 'Singapore', "text" => 'Singapore'),
        array( "key" => 'Sint Maarten (Dutch part)', "text" => 'Sint Maarten (Dutch part)'),
        array( "key" => 'Slovakia', "text" => 'Slovakia'),
        array( "key" => 'Slovenia', "text" => 'Slovenia'),
        array( "key" => 'Solomon Islands', "text" => 'Solomon Islands'),
        array( "key" => 'Somalia', "text" => 'Somalia'),
        array( "key" => 'South Africa', "text" => 'South Africa'),
        array(
          "key" => 'South Georgia and South Sandwich Islands',
          "text" => 'South Georgia and South Sandwich Islands'
        ),
        array( "key" => 'South Sudan', "text" => 'South Sudan'),
        array( "key" => 'Spain', "text" => 'Spain'),
        array( "key" => 'Sri Lanka', "text" => 'Sri Lanka'),
        array( "key" => 'Sudan', "text" => 'Sudan'),
        array( "key" => 'Suriname', "text" => 'Suriname'),
        array( "key" => 'Svalbard and Jan Mayen Islands', "text" => 'Svalbard and Jan Mayen Islands'),
        array( "key" => 'Swaziland', "text" => 'Swaziland'),
        array( "key" => 'Sweden', "text" => 'Sweden'),
        array( "key" => 'Switzerland', "text" => 'Switzerland'),
        array( "key" => 'Syria', "text" => 'Syria'),
        array( "key" => 'Taiwan', "text" => 'Taiwan'),
        array( "key" => 'Tajikistan', "text" => 'Tajikistan'),
        array( "key" => 'Tanzania', "text" => 'Tanzania'),
        array( "key" => 'Thailand', "text" => 'Thailand'),
        array( "key" => 'Timor-Leste', "text" => 'Timor-Leste'),
        array( "key" => 'Togo', "text" => 'Togo'),
        array( "key" => 'Tokelau', "text" => 'Tokelau'),
        array( "key" => 'Tonga', "text" => 'Tonga'),
        array( "key" => 'Trinidad and Tobago', "text" => 'Trinidad and Tobago'),
        array( "key" => 'Tunisia', "text" => 'Tunisia'),
        array( "key" => 'Turkey', "text" => 'Turkey'),
        array( "key" => 'Turkmenistan', "text" => 'Turkmenistan'),
        array( "key" => 'Turks and Caicos Islands', "text" => 'Turks and Caicos Islands'),
        array( "key" => 'Tuvalu', "text" => 'Tuvalu'),
        array( "key" => 'Uganda', "text" => 'Uganda'),
        array( "key" => 'Ukraine', "text" => 'Ukraine'),
        array( "key" => 'United Arab Emirates', "text" => 'United Arab Emirates'),
        array( "key" => 'United Kingdom', "text" => 'United Kingdom'),
        array( "key" => 'Uruguay', "text" => 'Uruguay'),
        array( "key" => 'Uzbekistan', "text" => 'Uzbekistan'),
        array( "key" => 'Vanuatu', "text" => 'Vanuatu'),
        array( "key" => 'Vatican City', "text" => 'Vatican City'),
        array( "key" => 'Venezuela', "text" => 'Venezuela'),
        array( "key" => 'Vietnam', "text" => 'Vietnam'),
        array( "key" => 'Virgin Islands, British', "text" => 'Virgin Islands, British'),
        array( "key" => 'Virgin Islands, U.S.', "text" => 'Virgin Islands, U.S.'),
        array( "key" => 'Wallis and Futuna Islands', "text" => 'Wallis and Futuna Islands'),
        array( "key" => 'Western Sahara', "text" => 'Western Sahara'),
        array( "key" => 'Yemen', "text" => 'Yemen'),
        array( "key" => 'Zambia', "text" => 'Zambia'),
        array( "key" => 'Zimbabwe', "text" => 'Zimbabwe')
        );

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
        if (!$testtype == 'lighthouse' && $lighthouse == 1) {
            $total_runs++;
        }
        return $total_runs;
    }

    /**
     * This is used to determine which hosts don't get counted in test runs
     */
    public static function getExemptHost(): string
    {
        return 'webpagetest.org';
    }
}
