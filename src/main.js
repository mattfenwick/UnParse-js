var imports = [
    "app/maybeerror",
    "app/parser",
    "app/example"
];

require(imports, function(me, pc, eg) {

    window.MaybeError = me;
    window.Parser = pc;
    window.Example = eg;
});
