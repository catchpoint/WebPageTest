# Adopt Laravel
📆 **Updated**: Aug 17, 2022

🙋🏽‍♀️ **Status** Proposed

## ℹ️ Context
WPT codebase has grown from mostly one- or two-person project to a fairly complex codebase with a tons of features and a team of engineers plus community contributors working simultaneously.

We want contributors, both community and internal, to be able to get in, figure out the relevant place in the code, make their change, and get out, as quickly and painlessly as possible.

## 🤔 Decision and scope of this ADR
Adopt [Laravel](https://laravel.com/) for the www codebase. Laravel can handle API requests, cron jobs, command line (console) tools, but we'll limit this ADR to web only. Follow up ADRs will deal with additional Laravel adoption.


## 🎬 Consequences
Migrating the home-grown codebase to a well-documented popular framework will help:
- people orient easier (and find answers to common questions on stackoverflow) and make a change in confidence.
- hire engineers with potentially some Laravel experience

## Process
We want the migration to be gradual and as unobtrusive as possible regarding day-to-day coding. We can attack the pieces (Routing, Models, Views, Controllers) separately and asynchronously.

The following as suggestions based on what we have in codebase, personal opinions, and an [informative article](https://www.phparch.com/2019/03/migrating-legacy-web-applications-to-laravel/) describing similar migrations.

### Phases

The migration can proceed in three phases:
* phase 1: prep (could take as long time as needed)
* phase 2: flip the Laravel switch (as short as possible, it's the disruptive one during which any other development is not recommended)
* phase 3: continuing adoption and clean up (as long as needed)

### Routing

In phase 1, We want to expose as little code to public www as possible as a preparation.

Laravel does all its web routing in `[LARAVELROOT]/routes/web.php`. In preparation we will move all routing away from server configs to `/www/index.php` which will then include the required script (controller), e.g. `testlog.php` which will be moved away from `www/` and into a formerly-www directory called `/wpt`.

The `/www` will contain only `/www/index.php` and static assets such as `/www/favicon.ico`, `/www/assets/js/`, `/www/assets/css/`

In phase 2 we move all routing from `/www/index.php` to `[LARAVELROOT]/routes/web.php`.

NOTE: `[LARAVELROOT]` could be anything, for example `/possum`. This is where all Laravel code lives. I'll use `/possum` in this ADR so it stands out. Later we can decide to rename it back to `/www` to avoid confusion. In this directory, only `/possum/public` is publicly facing.

In phase 2 we also move all the old code from `/wpt` to inside `/possum` (see the tree below).

In phase 3 we convert each of the old entry points from `/wpt` to Laravel controllers.

### Directory structure at phase 2

```sh
.
├── batchtool/
├── bulktest/
├── composer.json
├── docker/
├── docs/
└── possum/ # aka [LARAVELROOT]
    ├── app/
    │   ├── wpt/ # old www code, delete at the end of phase 3
    │   ├── Http/
    │   │   └── Controllers/
    │   ├── Models/
    │   └── View/ # overall layouts here, e.g. guest vs logged in
    ├── config/
    ├── public/
    │   ├── index.php # handled by Laravel now
    │   ├── favicon.ico
    │   └── assets/
    │       └── images/
    ├── resources/
    │   ├── css/
    │   ├── js/
    │   └── views/ # templates go here
    ├── routes/
    │   └── web.php # routing happens here
    ├── tests/ # moved from /www/tests
    └── vendor/ # moved from /www/vendor
 ```


### Views

In phase 1 we adopt the Blade templating engine. This is already [under way](https://github.com/catchpoint/WebPageTest/pull/2228) and the templates live in `www/resources`

In the same phase we convert the prior template work from `www/templates` (which has API similar to Blade) to Blade, so we avoid having things like three competing footers.

In phase 2 `www/resources` stays as-is in `possum/resources/` and we delete the glue code `www/resources/view.php` which now comes with Laravel.

In phase 3 we continue converting old code to Blade templates.

In essence the three phases are one long phase, interrupted by the Laravel switch (phase 2).

### Controllers

- Phase 1 - chill
- Phase 2 - create one controller (one idea is to use a 404 controller) that includes old code. Similar to what `www/index.php` does in phase 1.
- Phase 3 - convert old entry points to Laravel controllers

### Models

- Phase 1 and 2 - rest
- Phase 3 - yank spaghetti off of places with names like `common`, `.inc`, etc and into beautiful classes in `possum/app/wpt`. Or to `possum/app/Models` if it's database heavy.

## 📝 Changelog
- 07/17/2022 Proposed

