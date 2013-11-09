
var NEW_TESTS = [
    "test/maybeerror", 
    "test/combinators",
    "test/cst",
    "test/examples/json"
];

require(NEW_TESTS, function() {
    var mods = Array.prototype.slice.call(arguments);
    mods.map(function(mod, ix) {
        mod();
    });
});
