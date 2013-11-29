"use strict";

require([
    "app/maybeerror",
    "app/parser",
    "app/example"
], function(me, pc, eg) {
    window.MaybeError = me;
    window.Parser = pc;
    window.Example = eg;
});
