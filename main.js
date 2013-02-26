var imports = [
    "maybeerror",
    "parsercombinators",
    "example"
];

require(imports, function(me, pc, eg) {

    window.MaybeError = me;
    window.ParserCombinators = pc;
    window.Example = eg;
});
