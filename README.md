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

To get started, we'll assume we're in the `parser` module and
have the `Parser` object in scope.

The `parser` module defines a factory.  Parsers are defined in terms of an
underlying type, which is in the `maybeerror` module.  This module allows
three kinds of results:  

 1. success, which consumes part of the input and presents a result value
 2. failure, which allows backtracking and alternatives; 
 3. error, which is not recoverable and makes it possible to generate
    useful and specific error messages.

A Haskell definition would look something like:

    data MaybeError e a
        = Success a
        | Failure
        | Error e

In loose Haskell terms, Parsers could be defined in the following way:

    data Parser e s t a = Parser {parse :: (s -> [t] -> MaybeError e (s, [t], a))}

In other words, Parsers wrap functions that take two parameters: 1) a user
state, and 2) a token stream; they return either an error, failure, or a
successful result which comprises a possibly transformed user state, a
possibly transformed token stream, and a result value.

In the Javascript implementation, `Parser` is a constructor and an object.
It has methods that can be used directly as parsers, such as:

 - `Parser.item` -- fails if empty is empty, otherwise succeeds consuming one element
 - `Parser.getState` -- succeeds consuming no input, and presents the user state as the result value
 - `Parser.literal('3')` -- 
 
Other methods are called on existing parsers to create new parsers
that alter the behavior of the original:

 - `Parser.item.many1()` -- matches the `item` parser as many times as possible, succeeding and placing the results in an array
 - `Parser.literal('3').fmap(parseFloat)` -- applies a function to the result of a successful parser