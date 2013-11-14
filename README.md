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

It works with any object that supports the `seq[0]` and `seq.slice()`
operations, including strings and arrays.
