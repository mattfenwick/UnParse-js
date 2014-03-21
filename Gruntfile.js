"use strict";

// see http://jshint.com/docs/options/
var options = {
    "globals"       : {"require": false, "module": false},

    // "camelcase" : false,
    "bitwise"       : false,     // allow bitwise operators (&, |, ^, etc.).
    "curly"         : true,     // Require {} for every new block or scope.
    "eqeqeq"        : true,     // Require triple equals i.e. `===`.
    // "es3" : false,
    "forin"         : true,     // Tolerate `for in` loops without `hasOwnPrototype`.
    // "freeze": false,
    "immed"         : true,     // Require immediate invocations to be wrapped in parens e.g. `( function(){}() );`
    "indent": 4,
    "latedef"       : true,     // Prohibit variable use before definition.
    "newcap"        : true,     // Require capitalization of all constructor functions e.g. `new F()`.
    "noarg"         : true,     // Prohibit use of `arguments.caller` and `arguments.callee`.
    "noempty"       : true,     // Prohibit use of empty blocks.
    "nonbsp"        : true,
    "nonew"         : true,     // Prohibit use of constructors for side-effects.
    // "plusplus"      : true,     // Prohibit use of `++` & `--`.
    // "quotmark": false,
    "regexp"        : true,     // Prohibit `.` and `[^...]` in regular expressions.
    "undef"         : true,     // Require all non-global variables be declared before they are used.
    "unused"        : true,
    "strict"        : true,     // Require `use strict` pragma in every file.
    "trailing"      : true,     // Prohibit trailing whitespaces.
    // "maxparams": 1,
    // "maxdepth": 1,
    // "maxstatements": 1,
    // "maxcomplexity": 1,
    // "maxlen": 1,

    "maxerr"        : 10000     // Annoying when jshint stops partway through a file ... is 10K high enough?
};


module.exports = function(grunt) {

    grunt.initConfig({

        "jshint": {
            "gruntfile": {
                "options": options,
                "src": "Gruntfile.js"
            },
            "index": {
                "options": options,
                "src": "index.js"
            },
            "lib": {
                "options": options,
                "src": ["lib/*.js"]
            }
        }
    });

    grunt.loadNpmTasks("grunt-contrib-jshint");

    grunt.registerTask("default", ["jshint"]);

};

