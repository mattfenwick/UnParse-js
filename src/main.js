"use strict";

require([
    "unparse-js/maybeerror",
    "unparse-js/parser",
    "unparse-js/example"
], function(me, pc, eg) {
    window.MaybeError = me;
    window.Parser = pc;
    window.Example = eg;
});
