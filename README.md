restify_waterline_scaffold
==========================

Simple baseline scaffold to get you started using Waterline and Restify with TypeScript.


## Install prerequisites

  0. node & npm (tested with node v4 and npm v3.3.4 on Ubuntu 15.04 x64)
  1. Run: `npm install -g tsd typescript`
  2. `cd` to directory you've cloned this repo into
  3. Run: `typings install`
  4. Run: `npm install`

## Compile+run app

    tsc
    node main.js

Or:

    npm start

## Misc

### Cleanup compiled output

When not add *.js to `.gitignore`, clean out compiled js with this GNU findutils solution:

    find -name '*.js.map' -type f -exec bash -c 'rm "${1}" "${1%????}"' bash {} \;

Or delete all '*.js' outside of `node_modules` with:

    find \( -name node_modules -prune \) -o -name '*.js' -type f -exec rm {} \;find \( -name node_modules -prune \) -o -name '*.js' -type f -exec rm {} \;

More complicated solution handling "foo.ts" & "foo.js" without "foo.js.map" coming at some point.
