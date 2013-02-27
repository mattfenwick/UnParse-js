define(["app/maybeerror", "app/parsercombinators"], function(MaybeError, ParserFactory) {
    "use strict";

    var Parser = ParserFactory(MaybeError);
    
    return Parser;

});