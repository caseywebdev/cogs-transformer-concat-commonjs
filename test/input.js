require('./foo');
require('./bar.js');
require(SHOULD_BE_LEFT_AS_IDENTIFIER);
require('.');
require('baz');
require('fs');
require('./no-extension');
require('./one/1');
require('./one/two/2');
require('ignore-me');
require.async('./one/two/three/3');
import('./foo');
