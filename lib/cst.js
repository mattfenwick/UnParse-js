"use strict";

const C = require('./combinators.js');
const F = require('./functions.js');

function _forbid_duplicates(arr) {
    const keySet = new Set();
    arr.forEach(function(key) {
        if ( keySet.has(key) ) {
            throw new Error('duplicate name -- ' + key);
        }
        keySet.add(key);
    });
}

function _forbid_keys(forbidden, keys) {
    const keySet = new Set(keys);
    forbidden.forEach(function(key) {
        if ( keySet.has(key) ) {
            throw new Error('cst node: forbidden key: ' + key);
        }
    });
}

// e -> Parser [(e, s)] s (m t) a -> Parser [(e, s)] s (m t) a
function cut(message, parser) {
    C.checkParser('cut', parser);
    return C.bind(C.getState, (state) => C.commit([[message, state]], parser));
}

// e -> Parser [(e, s)] s (m t) a -> Parser [(e, s)] s (m t) a
function addErrorState(e, parser) {
    return C.bind(C.getState, (state) => C.addError([e, state], parser));
}

function node(name, ...pairs) {
    /*
    _pairs_: 0+ 2-element arrays
    1. runs parsers in sequence
    2. collects results into a dictionary
    3. grabs state at which parsers started
    4. adds an error frame
    */
    const names = pairs.map((x) => x[0]);
    _forbid_duplicates(names);
    _forbid_keys(['_name', '_start', '_end'], names);
    function action(start, results, end) {
        const out = F.dict(results);
        out._start = start;
        out._name = name;
        out._end = end;
        return out;
    }
    const childParsers = C.seq(pairs.map(([name, parser]) => {
        return C.fmap(value => [name, value], parser);
    }));
    return addErrorState(name, C.app(action, C.getState, childParsers, C.getState));
}

module.exports = {
    'node'    :  node,
    'cut'     :  cut,
    'addErrorState' : addErrorState
};

