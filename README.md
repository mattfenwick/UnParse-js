ParserCombinators
=================

### What ###

This is a parser combinator library for Javascript.
The key features are similar to many other parser
combinator libraries:

 - composable -- parsers can be easily combined and transformed to produce bigger parsers
 - functional -- avoids state mutation
 - backtracking
 - monadic
 - user state
 - error reporting capabilities

It works with both strings and arrays (of tokens).


### Brief API overview ###

The `parsercombinators` module defines a factory for generating 
parser builders.  As parsers' types are defined in terms of an
underlying type, the factory function needs an object supporting
specific methods.  See the `maybeerror` module for an example.

    var Parser = ParserFactory(MaybeError);

Now `Parser` is a parser builder.  It has methods that can be used
directly as parsers, such as:

 - `Parser.item` -- fails if empty is empty, otherwise succeeds consuming one element
 - `Parser.getState` -- succeeds consuming no input, and presents the user state as the result value
 
Other methods are called on existing parsers to create new parsers
that alter the behavior of the original:

 - `many0` -- matches a parser as many times as possible, succeeding and placing the results in an array
 - `fmap` -- applies a function to the result of a successful parser