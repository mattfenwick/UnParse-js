
var NEW_TESTS = [
    "test/maybeerror", 
    "test/parsercombinators"
];

require(NEW_TESTS, function() {
    var mods = Array.prototype.slice.call(arguments);
    mods.map(function(mod, ix) {
        mod();
    });
});
