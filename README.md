## UnParse-js ##

Another parser combinator library for Javascript?  Don't we have enough of those already???

That depends on what we want out of a parser library.  My preferences are for parsers that:

 - simple and clear definition of the parse model:
   - inputs
   - outputs
   - backtracking
   - (non)-deterministic 
   - prioritized choice
 
 - no magic.  Magic operators are often convenient, but it's more important -- 
   and useful in the long run -- to be able to easily implement the magic in
   terms of the model.

 - doesn't hide important details -- but also doesn't force you to worry about
   them unless you need to.

 - provides not just complex parsers, but also the primitive.  What are the most 
   basic parsers, out of which bigger ones are built?  
 
 - make parser composition easy.  This means there needs to be
   powerful operations for combining parsers, such as sequencing, monadic 
   sequencing, choice, and repetition.
 
 - doesn't treat lexing as a special case.  Lexing is no different from any
   other kind of parsing, except for the complexity of the language (sometimes).

 - compositional semantics.  Parser behavior should be consistent -- it must not
   depend on what context the parser is in.
 
 - works with the language, not against it.  Parsers should be able to take 
   advantage of a language's features and capabilities for abstraction -- 
   including functions and objects.  This means that it's easy to create new
   parsers, as well as combinators, using the language's facilities.

 - the result value of a successful parser is important.  I want full control
   over what value is generated.  I don't want a default parse tree crammed with
   tons of useless junk.  I don't want a mess of nested tuples.  Generating the
   result should be clean and simple.

 - errors are a key aspect of useful parsers.  How and when are they created,
   and with what information (position, message explaining the reason)?  Once
   an error is created, how is it propagated?  How do errors interact with the
   parse model -- backtracking -- and with parser composition?

These are the issues that UnParse-js addresses and that differentiate it from
other parser libraries.  Read on for more information!
 

## Overview ##

UnParse-js is a library for building complex parsers.  Parsers are created and
manipulated as Javascript objects, and are invoked using their `parse` method,
which takes two arguments:

 - the token sequence that is being parsed
 - the parsing state

The return value is one of three possible results:

 - success, including:
    - the remaining tokens
    - new state
    - result value
 - failure, which indicates that the match failed
 - error, which means that something bad happened and includes error information

Successful parses allow parsing to continue; failures allow parsing to backtrack
and try a different alternative; errors abort parsing immediately with relevant
error information to accurately indicate what and where the problem was.

UnParse-js supports monadic parsing, as well as combinators based on the Applicative,
Functor, MonadError, Alternative, and Traversable typeclasses, if you're familiar
with Haskell.  It also supports lookahead and optional parses.  

Best of all, since parsers are ordinary Javascript objects, they play by the rules --
you don't need any special knowledge or syntax to use them, they work just fine
with functions and classes, and you can put them in data structures.

UnParse-js avoids magic -- the kind of magic that makes it easy to do really simple
things, but hard to deal with actual real-world problems in a clean, sane way.
This allows UnParse-js to stay simple and focused -- and you don't need to worry 
about it mucking with things behind your back -- and free of arbitrary restrictions.
     

### Contact information ###

Found a bug?  Need help figuring something out?  Want a new feature?  Feel free
to report anything using the github issue tracker, or email me directly at
mfenwick100 at gmail dot com

