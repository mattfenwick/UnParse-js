"use strict";

require([
    "test/maybeerror", 
    "test/combinators",
    "test/cst"
], function($, Q) {
    var mods = Array.prototype.slice.call(arguments);
    mods.map(function(mod, ix) {
        mod();
    });
});
