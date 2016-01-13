require('./foo');
require('./bar.js');
require(SHOULD_BE_DISREGARDED);
require('.');
require('baz');
require('fs');
require('./no-extension');
