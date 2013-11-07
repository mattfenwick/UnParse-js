
var NEW_TESTS = [
    "test/maybeerror", 
    "test/combinators",
    "test/cst"
];

require(NEW_TESTS, function() {
    var mods = Array.prototype.slice.call(arguments);
    mods.map(function(mod, ix) {
        mod();
    });
});
