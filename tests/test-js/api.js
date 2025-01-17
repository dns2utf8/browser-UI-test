const process = require('process');
const parserFuncs = require('../../src/commands.js');
const Options = require('../../src/options.js').Options;
const {Assert, plural, print} = require('./utils.js');

function wrapper(callback, arg, options) {
    if (typeof options === 'undefined') {
        options = new Options();
    }
    return callback(arg, options);
}

function checkAssert(x, func) {
    x.assert(func('"'), {'error': 'expected `"` at the end of the string'});
    x.assert(func('1'),
        {'error': 'expected a tuple, a CSS selector or an XPath, found `1`'});
    x.assert(func('1.1'),
        {'error':
         'expected a tuple, a CSS selector or an XPath, found `1.1`'});
    x.assert(func('"a"'),
        {
            'instructions': ['if ((await page.$("a")) === null) { throw \'"a" not found\'; }'],
            'wait': false,
            'checkResult': true,
        });
    x.assert(func('("a", 2)'), {
        'error': 'expected only a CSS selector or an XPath in the tuple, found 2 elements',
    });
    x.assert(func('()'), {'error': 'unexpected `()`: tuples need at least one argument'});
    x.assert(func('("a")'),
        {
            'instructions': ['if ((await page.$("a")) === null) { throw \'"a" not found\'; }'],
            'wait': false,
            'checkResult': true,
        });

    // XPath
    x.assert(func('"/a"'), {'error': 'XPath must start with `//`'});
    x.assert(func('"//a"'),
        {
            'instructions': [
                'if ((await page.$x("//a")).length === 0) { throw \'XPath "//a" not found\'; }',
            ],
            'wait': false,
            'checkResult': true,
        });
}

function checkAssertFalse(x, func) {
    x.assert(func('"'), {'error': 'expected `"` at the end of the string'});
    x.assert(func('1'), {'error': 'expected a tuple, a CSS selector or an XPath, found `1`'});
    x.assert(func('1.1'), {'error': 'expected a tuple, a CSS selector or an XPath, found `1.1`'});
    x.assert(func('(a, "b")'), {
        'error': 'expected only a CSS selector or an XPath in the tuple, found 2 elements',
    });
    x.assert(func('("a", 2)'), {
        'error': 'expected only a CSS selector or an XPath in the tuple, found 2 elements',
    });
    x.assert(func('()'), {'error': 'unexpected `()`: tuples need at least one argument'});
    x.assert(func('"a"'),
        {
            'instructions': [
                'try {\n' +
                'if ((await page.$("a")) === null) { throw \'"a" not found\'; }\n' +
                '} catch(e) { return; } throw "assert didn\'t fail";',
            ],
            'wait': false,
            'checkResult': true,
        });
    x.assert(func('("a")'),
        {
            'instructions': [
                'try {\n' +
                'if ((await page.$("a")) === null) { throw \'"a" not found\'; }\n' +
                '} catch(e) { return; } throw "assert didn\'t fail";',
            ],
            'wait': false,
            'checkResult': true,
        });

    // XPath
    x.assert(func('"/a"'), {'error': 'XPath must start with `//`'});
    x.assert(func('"//a"'),
        {
            'instructions': [
                'try {\n' +
                'if ((await page.$x("//a")).length === 0) { throw \'XPath "//a" not found\'; }\n' +
                '} catch(e) { return; } throw "assert didn\'t fail";',
            ],
            'wait': false,
            'checkResult': true,
        });
}

function checkAssertAttribute(x, func) {
    x.assert(func('("a", "b", )'), {'error': 'unexpected `,` after `"b"`'});
    x.assert(func('("a", "b")'), {
        'error': 'expected JSON dictionary as second argument, found `"b"`',
    });
    x.assert(func('("a", "b" "c")'), {'error': 'expected `,`, found `"`'});
    x.assert(func('("a", "b" "c", ALL)'), {'error': 'expected `,`, found `"`'});
    x.assert(func('("a", "b", "c")'), {
        'error': 'expected JSON dictionary as second argument, found `"b"`',
    });
    x.assert(func('("a::after", {"a": 1}, all)'), {
        'error': 'expected identifier `ALL` as third argument or nothing, found `all`',
    });
    x.assert(func('("a::after", {"a": 1}, ALLO)'), {
        'error': 'expected identifier `ALL` as third argument or nothing, found `ALLO`',
    });
    x.assert(func('("a", {"b": "c", "b": "d"})'), {'error': 'attribute `b` is duplicated'});

    x.assert(func('("a", {"b": "c"})'), {
        'instructions': [
            'let parseAssertElemAttr = await page.$("a");\n' +
            'if (parseAssertElemAttr === null) { throw \'"a" not found\'; }\n' +
            'await page.evaluate(e => {\n' +
            'const parseAssertElemAttrDict = {"b":"c"};\n' +
            'for (const [parseAssertElemAttrAttribute, parseAssertElemAttrValue] of ' +
            'Object.entries(parseAssertElemAttrDict)) {\n' +
            'if (e.getAttribute(parseAssertElemAttrAttribute) !== parseAssertElemAttrValue) {\n' +
            'throw \'expected `\' + parseAssertElemAttrValue + \'` for attribute `\' + ' +
            'parseAssertElemAttrAttribute + \'` for selector `a`, found `\' + ' +
            'e.getAttribute(parseAssertElemAttrAttribute) + \'`\';\n' +
            '}\n' +
            '}\n' +
            '}, parseAssertElemAttr);',
        ],
        'wait': false,
        'checkResult': true,
    });
    x.assert(func('("a", {"b": "c"}, ALL)'), {
        'instructions': [
            'let parseAssertElemAttr = await page.$$("a");\n' +
            'if (parseAssertElemAttr.length === 0) { throw \'"a" not found\'; }\n' +
            'for (let i = 0, len = parseAssertElemAttr.length; i < len; ++i) {\n' +
            'await page.evaluate(e => {\n' +
            'const parseAssertElemAttrDict = {"b":"c"};\n' +
            'for (const [parseAssertElemAttrAttribute, parseAssertElemAttrValue] of ' +
            'Object.entries(parseAssertElemAttrDict)) {\n' +
            'if (e.getAttribute(parseAssertElemAttrAttribute) !== parseAssertElemAttrValue) {\n' +
            'throw \'expected `\' + parseAssertElemAttrValue + \'` for attribute `\' + ' +
            'parseAssertElemAttrAttribute + \'` for selector `a`, found `\' + ' +
            'e.getAttribute(parseAssertElemAttrAttribute) + \'`\';\n' +
            '}\n' +
            '}\n' +
            '}, parseAssertElemAttr[i]);\n' +
            '}',
        ],
        'wait': false,
        'checkResult': true,
    });
    x.assert(func('("a", {"\\"b": "c"})'), {
        'instructions': [
            'let parseAssertElemAttr = await page.$("a");\n' +
            'if (parseAssertElemAttr === null) { throw \'"a" not found\'; }\n' +
            'await page.evaluate(e => {\n' +
            'const parseAssertElemAttrDict = {"\\"b":"c"};\n' +
            'for (const [parseAssertElemAttrAttribute, parseAssertElemAttrValue] of ' +
            'Object.entries(parseAssertElemAttrDict)) {\n' +
            'if (e.getAttribute(parseAssertElemAttrAttribute) !== parseAssertElemAttrValue) {\n' +
            'throw \'expected `\' + parseAssertElemAttrValue + \'` for attribute `\' + ' +
            'parseAssertElemAttrAttribute + \'` for selector `a`, found `\' + ' +
            'e.getAttribute(parseAssertElemAttrAttribute) + \'`\';\n' +
            '}\n' +
            '}\n' +
            '}, parseAssertElemAttr);',
        ],
        'wait': false,
        'checkResult': true,
    });
    x.assert(func('("a", {"\\"b": "c"}, ALL)'), {
        'instructions': [
            'let parseAssertElemAttr = await page.$$("a");\n' +
            'if (parseAssertElemAttr.length === 0) { throw \'"a" not found\'; }\n' +
            'for (let i = 0, len = parseAssertElemAttr.length; i < len; ++i) {\n' +
            'await page.evaluate(e => {\n' +
            'const parseAssertElemAttrDict = {"\\"b":"c"};\n' +
            'for (const [parseAssertElemAttrAttribute, parseAssertElemAttrValue] of ' +
            'Object.entries(parseAssertElemAttrDict)) {\n' +
            'if (e.getAttribute(parseAssertElemAttrAttribute) !== parseAssertElemAttrValue) {\n' +
            'throw \'expected `\' + parseAssertElemAttrValue + \'` for attribute `\' + ' +
            'parseAssertElemAttrAttribute + \'` for selector `a`, found `\' + ' +
            'e.getAttribute(parseAssertElemAttrAttribute) + \'`\';\n' +
            '}\n' +
            '}\n' +
            '}, parseAssertElemAttr[i]);\n' +
            '}',
        ],
        'wait': false,
        'checkResult': true,
    });

    // XPath
    x.assert(func('("//a", {"b": "c"})'), {
        'instructions': [
            'let parseAssertElemAttr = await page.$x("//a");\n' +
            'if (parseAssertElemAttr.length === 0) { throw \'XPath "//a" not found\'; }\n' +
            'parseAssertElemAttr = parseAssertElemAttr[0];\n' +
            'await page.evaluate(e => {\n' +
            'const parseAssertElemAttrDict = {"b":"c"};\n' +
            'for (const [parseAssertElemAttrAttribute, parseAssertElemAttrValue] of ' +
            'Object.entries(parseAssertElemAttrDict)) {\n' +
            'if (e.getAttribute(parseAssertElemAttrAttribute) !== parseAssertElemAttrValue) {\n' +
            'throw \'expected `\' + parseAssertElemAttrValue + \'` for attribute `\' + ' +
            'parseAssertElemAttrAttribute + \'` for XPath `//a`, found `\' + ' +
            'e.getAttribute(parseAssertElemAttrAttribute) + \'`\';\n' +
            '}\n' +
            '}\n' +
            '}, parseAssertElemAttr);',
        ],
        'wait': false,
        'checkResult': true,
    });
    x.assert(func('("//a", {"b": "c"}, ALL)'), {
        'instructions': [
            'let parseAssertElemAttr = await page.$x("//a");\n' +
            'if (parseAssertElemAttr.length === 0) { throw \'XPath "//a" not found\'; }\n' +
            'for (let i = 0, len = parseAssertElemAttr.length; i < len; ++i) {\n' +
            'await page.evaluate(e => {\n' +
            'const parseAssertElemAttrDict = {"b":"c"};\n' +
            'for (const [parseAssertElemAttrAttribute, parseAssertElemAttrValue] of ' +
            'Object.entries(parseAssertElemAttrDict)) {\n' +
            'if (e.getAttribute(parseAssertElemAttrAttribute) !== parseAssertElemAttrValue) {\n' +
            'throw \'expected `\' + parseAssertElemAttrValue + \'` for attribute `\' + ' +
            'parseAssertElemAttrAttribute + \'` for XPath `//a`, found `\' + ' +
            'e.getAttribute(parseAssertElemAttrAttribute) + \'`\';\n' +
            '}\n' +
            '}\n' +
            '}, parseAssertElemAttr[i]);\n' +
            '}',
        ],
        'wait': false,
        'checkResult': true,
    });
}

function checkAssertAttributeFalse(x, func) {
    x.assert(func('("a", {)'), {'error': 'unexpected `)` after `{`'});
    x.assert(func('("a", "b")'), {
        'error': 'expected JSON dictionary as second argument, found `"b"`',
    });
    x.assert(func('("a", {"a": 1)'), {'error': 'unexpected `)` after `1`'});
    x.assert(func('("a::after", {"a": 1}, all)'), {
        'error': 'expected identifier `ALL` as third argument or nothing, found `all`',
    });
    x.assert(func('("a::after", {"a": 1}, ALLO)'), {
        'error': 'expected identifier `ALL` as third argument or nothing, found `ALLO`',
    });
    x.assert(func('("a", {"b": "c", "b": "d"})'), {'error': 'attribute `b` is duplicated'});

    x.assert(func('("a", {"a": 1})'), {
        'instructions': [
            'let parseAssertElemAttr = await page.$("a");\n' +
            'if (parseAssertElemAttr === null) { throw \'"a" not found\'; }\n' +
            'await page.evaluate(e => {\n' +
            'const parseAssertElemAttrDict = {"a":"1"};\n' +
            'for (const [parseAssertElemAttrAttribute, parseAssertElemAttrValue] of ' +
            'Object.entries(parseAssertElemAttrDict)) {\n' +
            'try {\n' +
            'if (e.getAttribute(parseAssertElemAttrAttribute) !== parseAssertElemAttrValue) {\n' +
            'throw \'expected `\' + parseAssertElemAttrValue + \'` for attribute `\' + ' +
            'parseAssertElemAttrAttribute + \'` for selector `a`, found `\' + ' +
            'e.getAttribute(parseAssertElemAttrAttribute) + \'`\';\n' +
            '}\n' +
            '} catch(e) { continue; } throw "assert didn\'t fail";\n' +
            '}\n' +
            '}, parseAssertElemAttr);',
        ],
        'wait': false,
        'checkResult': true,
    });
    x.assert(func('("a", {"a": 1}, ALL)'), {
        'instructions': [
            'let parseAssertElemAttr = await page.$$("a");\n' +
            'if (parseAssertElemAttr.length === 0) { throw \'"a" not found\'; }\n' +
            'for (let i = 0, len = parseAssertElemAttr.length; i < len; ++i) {\n' +
            'await page.evaluate(e => {\n' +
            'const parseAssertElemAttrDict = {"a":"1"};\n' +
            'for (const [parseAssertElemAttrAttribute, parseAssertElemAttrValue] of ' +
            'Object.entries(parseAssertElemAttrDict)) {\n' +
            'try {\n' +
            'if (e.getAttribute(parseAssertElemAttrAttribute) !== parseAssertElemAttrValue) {\n' +
            'throw \'expected `\' + parseAssertElemAttrValue + \'` for attribute `\' + ' +
            'parseAssertElemAttrAttribute + \'` for selector `a`, found `\' + ' +
            'e.getAttribute(parseAssertElemAttrAttribute) + \'`\';\n' +
            '}\n' +
            '} catch(e) { continue; } throw "assert didn\'t fail";\n' +
            '}\n' +
            '}, parseAssertElemAttr[i]);\n' +
            '}',
        ],
        'wait': false,
        'checkResult': true,
    });

    // Check the handling of pseudo elements
    x.assert(func('("a::after", {"a": 1})'), {
        'instructions': [
            'let parseAssertElemAttr = await page.$("a");\n' +
            'if (parseAssertElemAttr === null) { throw \'"a" not found\'; }\n' +
            'await page.evaluate(e => {\n' +
            'const parseAssertElemAttrDict = {"a":"1"};\n' +
            'for (const [parseAssertElemAttrAttribute, parseAssertElemAttrValue] of ' +
            'Object.entries(parseAssertElemAttrDict)) {\n' +
            'try {\n' +
            'if (e.getAttribute(parseAssertElemAttrAttribute) !== parseAssertElemAttrValue) {\n' +
            'throw \'expected `\' + parseAssertElemAttrValue + \'` for attribute `\' + ' +
            'parseAssertElemAttrAttribute + \'` for selector `a`, found `\' + ' +
            'e.getAttribute(parseAssertElemAttrAttribute) + \'`\';\n' +
            '}\n' +
            '} catch(e) { continue; } throw "assert didn\'t fail";\n' +
            '}\n' +
            '}, parseAssertElemAttr);',
        ],
        'wait': false,
        'checkResult': true,
    });
    x.assert(func('("a::after", {"a": 1}, ALL)'), {
        'instructions': [
            'let parseAssertElemAttr = await page.$$("a");\n' +
            'if (parseAssertElemAttr.length === 0) { throw \'"a" not found\'; }\n' +
            'for (let i = 0, len = parseAssertElemAttr.length; i < len; ++i) {\n' +
            'await page.evaluate(e => {\n' +
            'const parseAssertElemAttrDict = {"a":"1"};\n' +
            'for (const [parseAssertElemAttrAttribute, parseAssertElemAttrValue] of ' +
            'Object.entries(parseAssertElemAttrDict)) {\n' +
            'try {\n' +
            'if (e.getAttribute(parseAssertElemAttrAttribute) !== parseAssertElemAttrValue) {\n' +
            'throw \'expected `\' + parseAssertElemAttrValue + \'` for attribute `\' + ' +
            'parseAssertElemAttrAttribute + \'` for selector `a`, found `\' + ' +
            'e.getAttribute(parseAssertElemAttrAttribute) + \'`\';\n' +
            '}\n' +
            '} catch(e) { continue; } throw "assert didn\'t fail";\n' +
            '}\n' +
            '}, parseAssertElemAttr[i]);\n' +
            '}',
        ],
        'wait': false,
        'checkResult': true,
    });
    x.assert(func('("b:after", {"a": 1})'), {
        'instructions': [
            'let parseAssertElemAttr = await page.$("b:after");\n' +
            'if (parseAssertElemAttr === null) { throw \'"b:after" not found\'; }\n' +
            'await page.evaluate(e => {\n' +
            'const parseAssertElemAttrDict = {"a":"1"};\n' +
            'for (const [parseAssertElemAttrAttribute, parseAssertElemAttrValue] of ' +
            'Object.entries(parseAssertElemAttrDict)) {\n' +
            'try {\n' +
            'if (e.getAttribute(parseAssertElemAttrAttribute) !== parseAssertElemAttrValue) {\n' +
            'throw \'expected `\' + parseAssertElemAttrValue + \'` for attribute `\' + ' +
            'parseAssertElemAttrAttribute + \'` for selector `b:after`, found `\' + ' +
            'e.getAttribute(parseAssertElemAttrAttribute) + \'`\';\n' +
            '}\n' +
            '} catch(e) { continue; } throw "assert didn\'t fail";\n' +
            '}\n' +
            '}, parseAssertElemAttr);',
        ],
        'wait': false,
        'checkResult': true,
    });
    x.assert(func('("b:after", {"a": 1}, ALL)'), {
        'instructions': [
            'let parseAssertElemAttr = await page.$$("b:after");\n' +
            'if (parseAssertElemAttr.length === 0) { throw \'"b:after" not found\'; }\n' +
            'for (let i = 0, len = parseAssertElemAttr.length; i < len; ++i) {\n' +
            'await page.evaluate(e => {\n' +
            'const parseAssertElemAttrDict = {"a":"1"};\n' +
            'for (const [parseAssertElemAttrAttribute, parseAssertElemAttrValue] of ' +
            'Object.entries(parseAssertElemAttrDict)) {\n' +
            'try {\n' +
            'if (e.getAttribute(parseAssertElemAttrAttribute) !== parseAssertElemAttrValue) {\n' +
            'throw \'expected `\' + parseAssertElemAttrValue + \'` for attribute `\' + ' +
            'parseAssertElemAttrAttribute + \'` for selector `b:after`, found `\' + ' +
            'e.getAttribute(parseAssertElemAttrAttribute) + \'`\';\n' +
            '}\n' +
            '} catch(e) { continue; } throw "assert didn\'t fail";\n' +
            '}\n' +
            '}, parseAssertElemAttr[i]);\n' +
            '}',
        ],
        'wait': false,
        'checkResult': true,
    });
    x.assert(func('("a ::after", {"a": 1})'), {
        'instructions': [
            'let parseAssertElemAttr = await page.$("a ::after");\n' +
            'if (parseAssertElemAttr === null) { throw \'"a ::after" not found\'; }\n' +
            'await page.evaluate(e => {\n' +
            'const parseAssertElemAttrDict = {"a":"1"};\n' +
            'for (const [parseAssertElemAttrAttribute, parseAssertElemAttrValue] of ' +
            'Object.entries(parseAssertElemAttrDict)) {\n' +
            'try {\n' +
            'if (e.getAttribute(parseAssertElemAttrAttribute) !== parseAssertElemAttrValue) {\n' +
            'throw \'expected `\' + parseAssertElemAttrValue + \'` for attribute `\' + ' +
            'parseAssertElemAttrAttribute + \'` for selector `a ::after`, found `\' + ' +
            'e.getAttribute(parseAssertElemAttrAttribute) + \'`\';\n' +
            '}\n' +
            '} catch(e) { continue; } throw "assert didn\'t fail";\n' +
            '}\n' +
            '}, parseAssertElemAttr);',
        ],
        'wait': false,
        'checkResult': true,
    });
    x.assert(func('("a ::after", {"a": 1}, ALL)'), {
        'instructions': [
            'let parseAssertElemAttr = await page.$$("a ::after");\n' +
            'if (parseAssertElemAttr.length === 0) { throw \'"a ::after" not found\'; }\n' +
            'for (let i = 0, len = parseAssertElemAttr.length; i < len; ++i) {\n' +
            'await page.evaluate(e => {\n' +
            'const parseAssertElemAttrDict = {"a":"1"};\n' +
            'for (const [parseAssertElemAttrAttribute, parseAssertElemAttrValue] of ' +
            'Object.entries(parseAssertElemAttrDict)) {\n' +
            'try {\n' +
            'if (e.getAttribute(parseAssertElemAttrAttribute) !== parseAssertElemAttrValue) {\n' +
            'throw \'expected `\' + parseAssertElemAttrValue + \'` for attribute `\' + ' +
            'parseAssertElemAttrAttribute + \'` for selector `a ::after`, found `\' + ' +
            'e.getAttribute(parseAssertElemAttrAttribute) + \'`\';\n' +
            '}\n' +
            '} catch(e) { continue; } throw "assert didn\'t fail";\n' +
            '}\n' +
            '}, parseAssertElemAttr[i]);\n' +
            '}',
        ],
        'wait': false,
        'checkResult': true,
    });

    x.assert(func('("a", {"b": "c", "d": "e"})'), {
        'instructions': [
            'let parseAssertElemAttr = await page.$("a");\n' +
            'if (parseAssertElemAttr === null) { throw \'"a" not found\'; }\n' +
            'await page.evaluate(e => {\n' +
            'const parseAssertElemAttrDict = {"b":"c","d":"e"};\n' +
            'for (const [parseAssertElemAttrAttribute, parseAssertElemAttrValue] of ' +
            'Object.entries(parseAssertElemAttrDict)) {\n' +
            'try {\n' +
            'if (e.getAttribute(parseAssertElemAttrAttribute) !== parseAssertElemAttrValue) {\n' +
            'throw \'expected `\' + parseAssertElemAttrValue + \'` for attribute `\' + ' +
            'parseAssertElemAttrAttribute + \'` for selector `a`, found `\' + ' +
            'e.getAttribute(parseAssertElemAttrAttribute) + \'`\';\n' +
            '}\n' +
            '} catch(e) { continue; } throw "assert didn\'t fail";\n' +
            '}\n' +
            '}, parseAssertElemAttr);',
        ],
        'wait': false,
        'checkResult': true,
    });
    x.assert(func('("a", {"b": "c", "d": "e"}, ALL)'), {
        'instructions': [
            'let parseAssertElemAttr = await page.$$("a");\n' +
            'if (parseAssertElemAttr.length === 0) { throw \'"a" not found\'; }\n' +
            'for (let i = 0, len = parseAssertElemAttr.length; i < len; ++i) {\n' +
            'await page.evaluate(e => {\n' +
            'const parseAssertElemAttrDict = {"b":"c","d":"e"};\n' +
            'for (const [parseAssertElemAttrAttribute, parseAssertElemAttrValue] of ' +
            'Object.entries(parseAssertElemAttrDict)) {\n' +
            'try {\n' +
            'if (e.getAttribute(parseAssertElemAttrAttribute) !== parseAssertElemAttrValue) {\n' +
            'throw \'expected `\' + parseAssertElemAttrValue + \'` for attribute `\' + ' +
            'parseAssertElemAttrAttribute + \'` for selector `a`, found `\' + ' +
            'e.getAttribute(parseAssertElemAttrAttribute) + \'`\';\n' +
            '}\n' +
            '} catch(e) { continue; } throw "assert didn\'t fail";\n' +
            '}\n' +
            '}, parseAssertElemAttr[i]);\n' +
            '}',
        ],
        'wait': false,
        'checkResult': true,
    });
    x.assert(func('("a", {"\\"b": "c"})'), {
        'instructions': [
            'let parseAssertElemAttr = await page.$("a");\n' +
            'if (parseAssertElemAttr === null) { throw \'"a" not found\'; }\n' +
            'await page.evaluate(e => {\n' +
            'const parseAssertElemAttrDict = {"\\"b":"c"};\n' +
            'for (const [parseAssertElemAttrAttribute, parseAssertElemAttrValue] of ' +
            'Object.entries(parseAssertElemAttrDict)) {\n' +
            'try {\n' +
            'if (e.getAttribute(parseAssertElemAttrAttribute) !== parseAssertElemAttrValue) {\n' +
            'throw \'expected `\' + parseAssertElemAttrValue + \'` for attribute `\' + ' +
            'parseAssertElemAttrAttribute + \'` for selector `a`, found `\' + ' +
            'e.getAttribute(parseAssertElemAttrAttribute) + \'`\';\n' +
            '}\n' +
            '} catch(e) { continue; } throw "assert didn\'t fail";\n' +
            '}\n' +
            '}, parseAssertElemAttr);',
        ],
        'wait': false,
        'checkResult': true,
    });
    x.assert(func('("a", {"\\"b": "c"}, ALL)'), {
        'instructions': [
            'let parseAssertElemAttr = await page.$$("a");\n' +
            'if (parseAssertElemAttr.length === 0) { throw \'"a" not found\'; }\n' +
            'for (let i = 0, len = parseAssertElemAttr.length; i < len; ++i) {\n' +
            'await page.evaluate(e => {\n' +
            'const parseAssertElemAttrDict = {"\\"b":"c"};\n' +
            'for (const [parseAssertElemAttrAttribute, parseAssertElemAttrValue] of ' +
            'Object.entries(parseAssertElemAttrDict)) {\n' +
            'try {\n' +
            'if (e.getAttribute(parseAssertElemAttrAttribute) !== parseAssertElemAttrValue) {\n' +
            'throw \'expected `\' + parseAssertElemAttrValue + \'` for attribute `\' + ' +
            'parseAssertElemAttrAttribute + \'` for selector `a`, found `\' + ' +
            'e.getAttribute(parseAssertElemAttrAttribute) + \'`\';\n' +
            '}\n' +
            '} catch(e) { continue; } throw "assert didn\'t fail";\n' +
            '}\n' +
            '}, parseAssertElemAttr[i]);\n' +
            '}',
        ],
        'wait': false,
        'checkResult': true,
    });

    // XPath
    x.assert(func('("//a", {"b": "c"})'), {
        'instructions': [
            'let parseAssertElemAttr = await page.$x("//a");\n' +
            'if (parseAssertElemAttr.length === 0) { throw \'XPath "//a" not found\'; }\n' +
            'parseAssertElemAttr = parseAssertElemAttr[0];\n' +
            'await page.evaluate(e => {\n' +
            'const parseAssertElemAttrDict = {"b":"c"};\n' +
            'for (const [parseAssertElemAttrAttribute, parseAssertElemAttrValue] of ' +
            'Object.entries(parseAssertElemAttrDict)) {\n' +
            'try {\n' +
            'if (e.getAttribute(parseAssertElemAttrAttribute) !== parseAssertElemAttrValue) {\n' +
            'throw \'expected `\' + parseAssertElemAttrValue + \'` for attribute `\' + ' +
            'parseAssertElemAttrAttribute + \'` for XPath `//a`, found `\' + ' +
            'e.getAttribute(parseAssertElemAttrAttribute) + \'`\';\n' +
            '}\n' +
            '} catch(e) { continue; } throw "assert didn\'t fail";\n' +
            '}\n' +
            '}, parseAssertElemAttr);',
        ],
        'wait': false,
        'checkResult': true,
    });
    x.assert(func('("//a", {"b": "c"}, ALL)'), {
        'instructions': [
            'let parseAssertElemAttr = await page.$x("//a");\n' +
            'if (parseAssertElemAttr.length === 0) { throw \'XPath "//a" not found\'; }\n' +
            'for (let i = 0, len = parseAssertElemAttr.length; i < len; ++i) {\n' +
            'await page.evaluate(e => {\n' +
            'const parseAssertElemAttrDict = {"b":"c"};\n' +
            'for (const [parseAssertElemAttrAttribute, parseAssertElemAttrValue] of ' +
            'Object.entries(parseAssertElemAttrDict)) {\n' +
            'try {\n' +
            'if (e.getAttribute(parseAssertElemAttrAttribute) !== parseAssertElemAttrValue) {\n' +
            'throw \'expected `\' + parseAssertElemAttrValue + \'` for attribute `\' + ' +
            'parseAssertElemAttrAttribute + \'` for XPath `//a`, found `\' + ' +
            'e.getAttribute(parseAssertElemAttrAttribute) + \'`\';\n' +
            '}\n' +
            '} catch(e) { continue; } throw "assert didn\'t fail";\n' +
            '}\n' +
            '}, parseAssertElemAttr[i]);\n' +
            '}',
        ],
        'wait': false,
        'checkResult': true,
    });
}

function checkAssertCount(x, func) {
    x.assert(func('("a", 1, "c")'), {'error': 'unexpected argument after number of occurences'});
    x.assert(func('("a", 1 2)'), {'error': 'expected `,`, found `2`'});
    x.assert(func('("a", 1 a)'), {'error': 'expected `,`, found `a`'});
    x.assert(func('("a", 1)'),
        {
            'instructions': [
                'let parseAssertElemInt = await page.$$("a");\nif (parseAssertElemInt.length !== ' +
                '1) { throw \'expected 1 elements, found \' + parseAssertElemInt.length; }'],
            'wait': false,
            'checkResult': true,
        });
    x.assert(func('("a", -1)'), {'error': 'number of occurences cannot be negative: `-1`'});
    x.assert(func('("a", -1.0)'), {
        'error': 'expected integer for number of occurences, found float: `-1.0`',
    });
    x.assert(func('("a", 1.0)'), {
        'error': 'expected integer for number of occurences, found float: `1.0`',
    });

    // Check the handling of pseudo elements
    x.assert(func('("a::after", 1)'),
        {
            'instructions': [
                'let parseAssertElemInt = await page.$$("a");\nif (parseAssertElemInt.length !== ' +
                '1) { throw \'expected 1 elements, found \' + parseAssertElemInt.length; }'],
            'wait': false,
            'checkResult': true,
        });
    x.assert(func('("a:focus", 1)'),
        {
            'instructions': [
                'let parseAssertElemInt = await page.$$("a:focus");\n' +
                'if (parseAssertElemInt.length !== 1) { ' +
                'throw \'expected 1 elements, found \' + parseAssertElemInt.length; }'],
            'wait': false,
            'checkResult': true,
        });
    x.assert(func('("a :focus", 1)'),
        {
            'instructions': [
                'let parseAssertElemInt = await page.$$("a :focus");\n' +
                'if (parseAssertElemInt.length !== 1) { ' +
                'throw \'expected 1 elements, found \' + parseAssertElemInt.length; }'],
            'wait': false,
            'checkResult': true,
        });
    x.assert(func('("a ::after", 1)'),
        {
            'instructions': [
                'let parseAssertElemInt = await page.$$("a ::after");\n' +
                'if (parseAssertElemInt.length !== 1) { throw \'expected 1 elements, found \' + ' +
                'parseAssertElemInt.length; }'],
            'wait': false,
            'checkResult': true,
        });
}

function checkAssertCountFalse(x, func) {
    x.assert(func('("a", 1, "c")'), {'error': 'unexpected argument after number of occurences'});
    x.assert(func('("a", 1 2)'), {'error': 'expected `,`, found `2`'});
    x.assert(func('("a", 1 a)'), {'error': 'expected `,`, found `a`'});
    x.assert(func('("a", 1)'),
        {
            'instructions': [
                'let parseAssertElemInt = await page.$$("a");\n' +
                'try {\n' +
                'if (parseAssertElemInt.length !== 1) { throw \'expected 1 elements, found \' + ' +
                'parseAssertElemInt.length; }\n' +
                '} catch(e) { return; } throw "assert didn\'t fail";'],
            'wait': false,
            'checkResult': true,
        });
    x.assert(func('("a", -1)'), {'error': 'number of occurences cannot be negative: `-1`'});
    x.assert(func('("a", -1.0)'), {
        'error': 'expected integer for number of occurences, found float: `-1.0`',
    });
    x.assert(func('("a", 1.0)'), {
        'error': 'expected integer for number of occurences, found float: `1.0`',
    });

    // Check the handling of pseudo elements
    x.assert(func('("a::after", 1)'),
        {
            'instructions': [
                'let parseAssertElemInt = await page.$$("a");\n' +
                'try {\n' +
                'if (parseAssertElemInt.length !== 1) { throw \'expected 1 elements, found \' + ' +
                'parseAssertElemInt.length; }\n' +
                '} catch(e) { return; } throw "assert didn\'t fail";'],
            'wait': false,
            'checkResult': true,
        });
    x.assert(func('("a:hover", 1)'),
        {
            'instructions': [
                'let parseAssertElemInt = await page.$$("a:hover");\n' +
                'try {\n' +
                'if (parseAssertElemInt.length !== 1) { throw \'expected 1 elements, found \' + ' +
                'parseAssertElemInt.length; }\n' +
                '} catch(e) { return; } throw "assert didn\'t fail";'],
            'wait': false,
            'checkResult': true,
        });
    x.assert(func('("a :after", 1)'),
        {
            'instructions': [
                'let parseAssertElemInt = await page.$$("a :after");\n' +
                'try {\n' +
                'if (parseAssertElemInt.length !== 1) { throw \'expected 1 elements, found \' + ' +
                'parseAssertElemInt.length; }\n' +
                '} catch(e) { return; } throw "assert didn\'t fail";'],
            'wait': false,
            'checkResult': true,
        });
    x.assert(func('("a ::after", 1)'),
        {
            'instructions': [
                'let parseAssertElemInt = await page.$$("a ::after");\n' +
                'try {\n' +
                'if (parseAssertElemInt.length !== 1) { throw \'expected 1 elements, found \' + ' +
                'parseAssertElemInt.length; }\n' +
                '} catch(e) { return; } throw "assert didn\'t fail";'],
            'wait': false,
            'checkResult': true,
        });
}

function checkAssertCss(x, func) {
    x.assert(func('("a", "b", )'), {'error': 'unexpected `,` after `"b"`'});
    x.assert(func('("a", "b")'), {
        'error': 'expected JSON dictionary as second argument, found `"b"`',
    });
    x.assert(func('("a", "b" "c")'), {'error': 'expected `,`, found `"`'});
    x.assert(func('("a", "b" "c", ALL)'), {'error': 'expected `,`, found `"`'});
    x.assert(func('("a", "b", "c")'), {
        'error': 'expected JSON dictionary as second argument, found `"b"`',
    });
    x.assert(func('("a::after", {"a": 1}, all)'), {
        'error': 'expected identifier `ALL` as third argument or nothing, found `all`',
    });
    x.assert(func('("a::after", {"a": 1}, ALLO)'), {
        'error': 'expected identifier `ALL` as third argument or nothing, found `ALLO`',
    });
    x.assert(func('("a", {"b": "c", "b": "d"})'), {'error': 'CSS property `b` is duplicated'});

    x.assert(func('("a", {"a": 1})'), {
        'instructions': [
            'let parseAssertElemCss = await page.$("a");\n' +
            'if (parseAssertElemCss === null) { throw \'"a" not found\'; }\n' +
            'await page.evaluate(e => {\n' +
            'let assertComputedStyle = getComputedStyle(e);\n' +
            'const parseAssertElemCssDict = {"a":"1"};\n' +
            'for (const [parseAssertElemCssKey, parseAssertElemCssValue] of ' +
            'Object.entries(parseAssertElemCssDict)) {\n' +
            'if (e.style[parseAssertElemCssKey] != parseAssertElemCssValue && ' +
            'assertComputedStyle[parseAssertElemCssKey] != parseAssertElemCssValue) {\n' +
            'throw \'expected `\' + parseAssertElemCssValue + \'` for key `\' + ' +
            'parseAssertElemCssKey + \'` for selector `a`, found `\' + ' +
            'assertComputedStyle[parseAssertElemCssKey] + \'`\';\n' +
            '}\n' +
            '}\n' +
            '}, parseAssertElemCss);',
        ],
        'wait': false,
        'checkResult': true,
    });
    x.assert(func('("a", {"a": 1}, ALL)'), {
        'instructions': [
            'let parseAssertElemCss = await page.$$("a");\n' +
            'if (parseAssertElemCss.length === 0) { throw \'"a" not found\'; }\n' +
            'for (let i = 0, len = parseAssertElemCss.length; i < len; ++i) {\n' +
            'await page.evaluate(e => {\n' +
            'let assertComputedStyle = getComputedStyle(e);\n' +
            'const parseAssertElemCssDict = {"a":"1"};\n' +
            'for (const [parseAssertElemCssKey, parseAssertElemCssValue] of ' +
            'Object.entries(parseAssertElemCssDict)) {\n' +
            'if (e.style[parseAssertElemCssKey] != parseAssertElemCssValue && ' +
            'assertComputedStyle[parseAssertElemCssKey] != parseAssertElemCssValue) {\n' +
            'throw \'expected `\' + parseAssertElemCssValue + \'` for key `\' + ' +
            'parseAssertElemCssKey + \'` for selector `a`, found `\' + ' +
            'assertComputedStyle[parseAssertElemCssKey] + \'`\';\n' +
            '}\n' +
            '}\n' +
            '}, parseAssertElemCss[i]);\n' +
            '}',
        ],
        'wait': false,
        'checkResult': true,
    });

    // Check the handling of pseudo elements
    x.assert(func('("a::after", {"a": 1})'), {
        'instructions': [
            'let parseAssertElemCss = await page.$("a");\n' +
            'if (parseAssertElemCss === null) { throw \'"a" not found\'; }\n' +
            'await page.evaluate(e => {\n' +
            'let assertComputedStyle = getComputedStyle(e, "::after");\n' +
            'const parseAssertElemCssDict = {"a":"1"};\n' +
            'for (const [parseAssertElemCssKey, parseAssertElemCssValue] of ' +
            'Object.entries(parseAssertElemCssDict)) {\n' +
            'if (e.style[parseAssertElemCssKey] != parseAssertElemCssValue && ' +
            'assertComputedStyle[parseAssertElemCssKey] != parseAssertElemCssValue) {\n' +
            'throw \'expected `\' + parseAssertElemCssValue + \'` for key `\' + ' +
            'parseAssertElemCssKey + \'` for selector `a`, found `\' + ' +
            'assertComputedStyle[parseAssertElemCssKey] + \'`\';\n' +
            '}\n' +
            '}\n' +
            '}, parseAssertElemCss);',
        ],
        'wait': false,
        'checkResult': true,
    });
    x.assert(func('("a::after", {"a": 1}, ALL)'), {
        'instructions': [
            'let parseAssertElemCss = await page.$$("a");\n' +
            'if (parseAssertElemCss.length === 0) { throw \'"a" not found\'; }\n' +
            'for (let i = 0, len = parseAssertElemCss.length; i < len; ++i) {\n' +
            'await page.evaluate(e => {\n' +
            'let assertComputedStyle = getComputedStyle(e, "::after");\n' +
            'const parseAssertElemCssDict = {"a":"1"};\n' +
            'for (const [parseAssertElemCssKey, parseAssertElemCssValue] of ' +
            'Object.entries(parseAssertElemCssDict)) {\n' +
            'if (e.style[parseAssertElemCssKey] != parseAssertElemCssValue && ' +
            'assertComputedStyle[parseAssertElemCssKey] != parseAssertElemCssValue) {\n' +
            'throw \'expected `\' + parseAssertElemCssValue + \'` for key `\' + ' +
            'parseAssertElemCssKey + \'` for selector `a`, found `\' + ' +
            'assertComputedStyle[parseAssertElemCssKey] + \'`\';\n' +
            '}\n' +
            '}\n' +
            '}, parseAssertElemCss[i]);\n' +
            '}',
        ],
        'wait': false,
        'checkResult': true,
    });
    x.assert(func('("a:focus", {"a": 1})'), {
        'instructions': [
            'let parseAssertElemCss = await page.$("a:focus");\n' +
            'if (parseAssertElemCss === null) { throw \'"a:focus" not found\'; }\n' +
            'await page.evaluate(e => {\n' +
            'let assertComputedStyle = getComputedStyle(e);\n' +
            'const parseAssertElemCssDict = {"a":"1"};\n' +
            'for (const [parseAssertElemCssKey, parseAssertElemCssValue] of ' +
            'Object.entries(parseAssertElemCssDict)) {\n' +
            'if (e.style[parseAssertElemCssKey] != parseAssertElemCssValue && ' +
            'assertComputedStyle[parseAssertElemCssKey] != parseAssertElemCssValue) {\n' +
            'throw \'expected `\' + parseAssertElemCssValue + \'` for key `\' + ' +
            'parseAssertElemCssKey + \'` for selector `a:focus`, found `\' + ' +
            'assertComputedStyle[parseAssertElemCssKey] + \'`\';\n' +
            '}\n' +
            '}\n' +
            '}, parseAssertElemCss);',
        ],
        'wait': false,
        'checkResult': true,
    });
    x.assert(func('("a:focus", {"a": 1}, ALL)'), {
        'instructions': [
            'let parseAssertElemCss = await page.$$("a:focus");\n' +
            'if (parseAssertElemCss.length === 0) { throw \'"a:focus" not found\'; }\n' +
            'for (let i = 0, len = parseAssertElemCss.length; i < len; ++i) {\n' +
            'await page.evaluate(e => {\n' +
            'let assertComputedStyle = getComputedStyle(e);\n' +
            'const parseAssertElemCssDict = {"a":"1"};\n' +
            'for (const [parseAssertElemCssKey, parseAssertElemCssValue] of ' +
            'Object.entries(parseAssertElemCssDict)) {\n' +
            'if (e.style[parseAssertElemCssKey] != parseAssertElemCssValue && ' +
            'assertComputedStyle[parseAssertElemCssKey] != parseAssertElemCssValue) {\n' +
            'throw \'expected `\' + parseAssertElemCssValue + \'` for key `\' + ' +
            'parseAssertElemCssKey + \'` for selector `a:focus`, found `\' + ' +
            'assertComputedStyle[parseAssertElemCssKey] + \'`\';\n' +
            '}\n' +
            '}\n' +
            '}, parseAssertElemCss[i]);\n' +
            '}',
        ],
        'wait': false,
        'checkResult': true,
    });
    x.assert(func('("a ::after", {"a": 1})'), {
        'instructions': [
            'let parseAssertElemCss = await page.$("a ::after");\n' +
            'if (parseAssertElemCss === null) { throw \'"a ::after" not found\'; }\n' +
            'await page.evaluate(e => {\n' +
            'let assertComputedStyle = getComputedStyle(e);\n' +
            'const parseAssertElemCssDict = {"a":"1"};\n' +
            'for (const [parseAssertElemCssKey, parseAssertElemCssValue] of ' +
            'Object.entries(parseAssertElemCssDict)) {\n' +
            'if (e.style[parseAssertElemCssKey] != parseAssertElemCssValue && ' +
            'assertComputedStyle[parseAssertElemCssKey] != parseAssertElemCssValue) {\n' +
            'throw \'expected `\' + parseAssertElemCssValue + \'` for key `\' + ' +
            'parseAssertElemCssKey + \'` for selector `a ::after`, found `\' + ' +
            'assertComputedStyle[parseAssertElemCssKey] + \'`\';\n' +
            '}\n' +
            '}\n' +
            '}, parseAssertElemCss);',
        ],
        'wait': false,
        'checkResult': true,
    });
    x.assert(func('("a ::after", {"a": 1}, ALL)'), {
        'instructions': [
            'let parseAssertElemCss = await page.$$("a ::after");\n' +
            'if (parseAssertElemCss.length === 0) { throw \'"a ::after" not found\'; }\n' +
            'for (let i = 0, len = parseAssertElemCss.length; i < len; ++i) {\n' +
            'await page.evaluate(e => {\n' +
            'let assertComputedStyle = getComputedStyle(e);\n' +
            'const parseAssertElemCssDict = {"a":"1"};\n' +
            'for (const [parseAssertElemCssKey, parseAssertElemCssValue] of ' +
            'Object.entries(parseAssertElemCssDict)) {\n' +
            'if (e.style[parseAssertElemCssKey] != parseAssertElemCssValue && ' +
            'assertComputedStyle[parseAssertElemCssKey] != parseAssertElemCssValue) {\n' +
            'throw \'expected `\' + parseAssertElemCssValue + \'` for key `\' + ' +
            'parseAssertElemCssKey + \'` for selector `a ::after`, found `\' + ' +
            'assertComputedStyle[parseAssertElemCssKey] + \'`\';\n' +
            '}\n' +
            '}\n' +
            '}, parseAssertElemCss[i]);\n' +
            '}',
        ],
        'wait': false,
        'checkResult': true,
    });

    // XPath
    x.assert(func('("//a", {"a": 1})'), {
        'instructions': [
            'let parseAssertElemCss = await page.$x("//a");\n' +
            'if (parseAssertElemCss.length === 0) { throw \'XPath "//a" not found\'; }\n' +
            'parseAssertElemCss = parseAssertElemCss[0];\n' +
            'await page.evaluate(e => {\n' +
            'let assertComputedStyle = getComputedStyle(e);\n' +
            'const parseAssertElemCssDict = {"a":"1"};\n' +
            'for (const [parseAssertElemCssKey, parseAssertElemCssValue] of ' +
            'Object.entries(parseAssertElemCssDict)) {\n' +
            'if (e.style[parseAssertElemCssKey] != parseAssertElemCssValue && ' +
            'assertComputedStyle[parseAssertElemCssKey] != parseAssertElemCssValue) {\n' +
            'throw \'expected `\' + parseAssertElemCssValue + \'` for key `\' + ' +
            'parseAssertElemCssKey + \'` for XPath `//a`, found `\' + ' +
            'assertComputedStyle[parseAssertElemCssKey] + \'`\';\n' +
            '}\n' +
            '}\n' +
            '}, parseAssertElemCss);',
        ],
        'wait': false,
        'checkResult': true,
    });
    x.assert(func('("//a", {"a": 1}, ALL)'), {
        'instructions': [
            'let parseAssertElemCss = await page.$x("//a");\n' +
            'if (parseAssertElemCss.length === 0) { throw \'XPath "//a" not found\'; }\n' +
            'for (let i = 0, len = parseAssertElemCss.length; i < len; ++i) {\n' +
            'await page.evaluate(e => {\n' +
            'let assertComputedStyle = getComputedStyle(e);\n' +
            'const parseAssertElemCssDict = {"a":"1"};\n' +
            'for (const [parseAssertElemCssKey, parseAssertElemCssValue] of ' +
            'Object.entries(parseAssertElemCssDict)) {\n' +
            'if (e.style[parseAssertElemCssKey] != parseAssertElemCssValue && ' +
            'assertComputedStyle[parseAssertElemCssKey] != parseAssertElemCssValue) {\n' +
            'throw \'expected `\' + parseAssertElemCssValue + \'` for key `\' + ' +
            'parseAssertElemCssKey + \'` for XPath `//a`, found `\' + ' +
            'assertComputedStyle[parseAssertElemCssKey] + \'`\';\n' +
            '}\n' +
            '}\n' +
            '}, parseAssertElemCss[i]);\n' +
            '}',
        ],
        'wait': false,
        'checkResult': true,
    });
}

function checkAssertCssFalse(x, func) {
    x.assert(func('("a", "b", )'), {'error': 'unexpected `,` after `"b"`'});
    x.assert(func('("a", "b")'), {
        'error': 'expected JSON dictionary as second argument, found `"b"`',
    });
    x.assert(func('("a", "b" "c")'), {'error': 'expected `,`, found `"`'});
    x.assert(func('("a", "b" "c", ALL)'), {'error': 'expected `,`, found `"`'});
    x.assert(func('("a", "b", "c")'), {
        'error': 'expected JSON dictionary as second argument, found `"b"`',
    });
    x.assert(func('("a::after", {"a": 1}, all)'), {
        'error': 'expected identifier `ALL` as third argument or nothing, found `all`',
    });
    x.assert(func('("a::after", {"a": 1}, ALLO)'), {
        'error': 'expected identifier `ALL` as third argument or nothing, found `ALLO`',
    });
    x.assert(func('("a", {"b": "c", "b": "d"})'), {'error': 'CSS property `b` is duplicated'});

    x.assert(func('("a", {"a": 1})'), {
        'instructions': [
            'let parseAssertElemCss = await page.$("a");\n' +
            'if (parseAssertElemCss === null) { throw \'"a" not found\'; }\n' +
            'await page.evaluate(e => {\n' +
            'let assertComputedStyle = getComputedStyle(e);\n' +
            'const parseAssertElemCssDict = {"a":"1"};\n' +
            'for (const [parseAssertElemCssKey, parseAssertElemCssValue] of ' +
            'Object.entries(parseAssertElemCssDict)) {\n' +
            'try {\n' +
            'if (e.style[parseAssertElemCssKey] != parseAssertElemCssValue && ' +
            'assertComputedStyle[parseAssertElemCssKey] != parseAssertElemCssValue) {\n' +
            'throw \'expected `\' + parseAssertElemCssValue + \'` for key `\' + ' +
            'parseAssertElemCssKey + \'` for selector `a`, found `\' + ' +
            'assertComputedStyle[parseAssertElemCssKey] + \'`\';\n' +
            '}\n' +
            '} catch(e) { continue; } throw "assert didn\'t fail";\n' +
            '}\n' +
            '}, parseAssertElemCss);',
        ],
        'wait': false,
        'checkResult': true,
    });
    x.assert(func('("a", {"a": 1}, ALL)'), {
        'instructions': [
            'let parseAssertElemCss = await page.$$("a");\n' +
            'if (parseAssertElemCss.length === 0) { throw \'"a" not found\'; }\n' +
            'for (let i = 0, len = parseAssertElemCss.length; i < len; ++i) {\n' +
            'await page.evaluate(e => {\n' +
            'let assertComputedStyle = getComputedStyle(e);\n' +
            'const parseAssertElemCssDict = {"a":"1"};\n' +
            'for (const [parseAssertElemCssKey, parseAssertElemCssValue] of ' +
            'Object.entries(parseAssertElemCssDict)) {\n' +
            'try {\n' +
            'if (e.style[parseAssertElemCssKey] != parseAssertElemCssValue && ' +
            'assertComputedStyle[parseAssertElemCssKey] != parseAssertElemCssValue) {\n' +
            'throw \'expected `\' + parseAssertElemCssValue + \'` for key `\' + ' +
            'parseAssertElemCssKey + \'` for selector `a`, found `\' + ' +
            'assertComputedStyle[parseAssertElemCssKey] + \'`\';\n' +
            '}\n' +
            '} catch(e) { continue; } throw "assert didn\'t fail";\n' +
            '}\n' +
            '}, parseAssertElemCss[i]);\n' +
            '}',
        ],
        'wait': false,
        'checkResult': true,
    });

    x.assert(func('("a::after", {"a": 1})'), {
        'instructions': [
            'let parseAssertElemCss = await page.$("a");\n' +
            'if (parseAssertElemCss === null) { throw \'"a" not found\'; }\n' +
            'await page.evaluate(e => {\n' +
            'let assertComputedStyle = getComputedStyle(e, "::after");\n' +
            'const parseAssertElemCssDict = {"a":"1"};\n' +
            'for (const [parseAssertElemCssKey, parseAssertElemCssValue] of ' +
            'Object.entries(parseAssertElemCssDict)) {\n' +
            'try {\n' +
            'if (e.style[parseAssertElemCssKey] != parseAssertElemCssValue && ' +
            'assertComputedStyle[parseAssertElemCssKey] != parseAssertElemCssValue) {\n' +
            'throw \'expected `\' + parseAssertElemCssValue + \'` for key `\' + ' +
            'parseAssertElemCssKey + \'` for selector `a`, found `\' + ' +
            'assertComputedStyle[parseAssertElemCssKey] + \'`\';\n' +
            '}\n' +
            '} catch(e) { continue; } throw "assert didn\'t fail";\n' +
            '}\n' +
            '}, parseAssertElemCss);',
        ],
        'wait': false,
        'checkResult': true,
    });
    x.assert(func('("a::after", {"a": 1}, ALL)'), {
        'instructions': [
            'let parseAssertElemCss = await page.$$("a");\n' +
            'if (parseAssertElemCss.length === 0) { throw \'"a" not found\'; }\n' +
            'for (let i = 0, len = parseAssertElemCss.length; i < len; ++i) {\n' +
            'await page.evaluate(e => {\n' +
            'let assertComputedStyle = getComputedStyle(e, "::after");\n' +
            'const parseAssertElemCssDict = {"a":"1"};\n' +
            'for (const [parseAssertElemCssKey, parseAssertElemCssValue] of ' +
            'Object.entries(parseAssertElemCssDict)) {\n' +
            'try {\n' +
            'if (e.style[parseAssertElemCssKey] != parseAssertElemCssValue && ' +
            'assertComputedStyle[parseAssertElemCssKey] != parseAssertElemCssValue) {\n' +
            'throw \'expected `\' + parseAssertElemCssValue + \'` for key `\' + ' +
            'parseAssertElemCssKey + \'` for selector `a`, found `\' + ' +
            'assertComputedStyle[parseAssertElemCssKey] + \'`\';\n' +
            '}\n' +
            '} catch(e) { continue; } throw "assert didn\'t fail";\n' +
            '}\n' +
            '}, parseAssertElemCss[i]);\n' +
            '}',
        ],
        'wait': false,
        'checkResult': true,
    });
    x.assert(func('("b:after", {"a": 1})'), {
        'instructions': [
            'let parseAssertElemCss = await page.$("b:after");\n' +
            'if (parseAssertElemCss === null) { throw \'"b:after" not found\'; }\n' +
            'await page.evaluate(e => {\n' +
            'let assertComputedStyle = getComputedStyle(e);\n' +
            'const parseAssertElemCssDict = {"a":"1"};\n' +
            'for (const [parseAssertElemCssKey, parseAssertElemCssValue] of ' +
            'Object.entries(parseAssertElemCssDict)) {\n' +
            'try {\n' +
            'if (e.style[parseAssertElemCssKey] != parseAssertElemCssValue && ' +
            'assertComputedStyle[parseAssertElemCssKey] != parseAssertElemCssValue) {\n' +
            'throw \'expected `\' + parseAssertElemCssValue + \'` for key `\' + ' +
            'parseAssertElemCssKey + \'` for selector `b:after`, found `\' + ' +
            'assertComputedStyle[parseAssertElemCssKey] + \'`\';\n' +
            '}\n' +
            '} catch(e) { continue; } throw "assert didn\'t fail";\n' +
            '}\n' +
            '}, parseAssertElemCss);',
        ],
        'wait': false,
        'checkResult': true,
    });
    x.assert(func('("b:after", {"a": 1}, ALL)'), {
        'instructions': [
            'let parseAssertElemCss = await page.$$("b:after");\n' +
            'if (parseAssertElemCss.length === 0) { throw \'"b:after" not found\'; }\n' +
            'for (let i = 0, len = parseAssertElemCss.length; i < len; ++i) {\n' +
            'await page.evaluate(e => {\n' +
            'let assertComputedStyle = getComputedStyle(e);\n' +
            'const parseAssertElemCssDict = {"a":"1"};\n' +
            'for (const [parseAssertElemCssKey, parseAssertElemCssValue] of ' +
            'Object.entries(parseAssertElemCssDict)) {\n' +
            'try {\n' +
            'if (e.style[parseAssertElemCssKey] != parseAssertElemCssValue && ' +
            'assertComputedStyle[parseAssertElemCssKey] != parseAssertElemCssValue) {\n' +
            'throw \'expected `\' + parseAssertElemCssValue + \'` for key `\' + ' +
            'parseAssertElemCssKey + \'` for selector `b:after`, found `\' + ' +
            'assertComputedStyle[parseAssertElemCssKey] + \'`\';\n' +
            '}\n' +
            '} catch(e) { continue; } throw "assert didn\'t fail";\n' +
            '}\n' +
            '}, parseAssertElemCss[i]);\n' +
            '}',
        ],
        'wait': false,
        'checkResult': true,
    });
    x.assert(func('("a ::after", {"a": 1})'), {
        'instructions': [
            'let parseAssertElemCss = await page.$("a ::after");\n' +
            'if (parseAssertElemCss === null) { throw \'"a ::after" not found\'; }\n' +
            'await page.evaluate(e => {\n' +
            'let assertComputedStyle = getComputedStyle(e);\n' +
            'const parseAssertElemCssDict = {"a":"1"};\n' +
            'for (const [parseAssertElemCssKey, parseAssertElemCssValue] of ' +
            'Object.entries(parseAssertElemCssDict)) {\n' +
            'try {\n' +
            'if (e.style[parseAssertElemCssKey] != parseAssertElemCssValue && ' +
            'assertComputedStyle[parseAssertElemCssKey] != parseAssertElemCssValue) {\n' +
            'throw \'expected `\' + parseAssertElemCssValue + \'` for key `\' + ' +
            'parseAssertElemCssKey + \'` for selector `a ::after`, found `\' + ' +
            'assertComputedStyle[parseAssertElemCssKey] + \'`\';\n' +
            '}\n' +
            '} catch(e) { continue; } throw "assert didn\'t fail";\n' +
            '}\n' +
            '}, parseAssertElemCss);',
        ],
        'wait': false,
        'checkResult': true,
    });
    x.assert(func('("a ::after", {"a": 1}, ALL)'), {
        'instructions': [
            'let parseAssertElemCss = await page.$$("a ::after");\n' +
            'if (parseAssertElemCss.length === 0) { throw \'"a ::after" not found\'; }\n' +
            'for (let i = 0, len = parseAssertElemCss.length; i < len; ++i) {\n' +
            'await page.evaluate(e => {\n' +
            'let assertComputedStyle = getComputedStyle(e);\n' +
            'const parseAssertElemCssDict = {"a":"1"};\n' +
            'for (const [parseAssertElemCssKey, parseAssertElemCssValue] of ' +
            'Object.entries(parseAssertElemCssDict)) {\n' +
            'try {\n' +
            'if (e.style[parseAssertElemCssKey] != parseAssertElemCssValue && ' +
            'assertComputedStyle[parseAssertElemCssKey] != parseAssertElemCssValue) {\n' +
            'throw \'expected `\' + parseAssertElemCssValue + \'` for key `\' + ' +
            'parseAssertElemCssKey + \'` for selector `a ::after`, found `\' + ' +
            'assertComputedStyle[parseAssertElemCssKey] + \'`\';\n' +
            '}\n' +
            '} catch(e) { continue; } throw "assert didn\'t fail";\n' +
            '}\n' +
            '}, parseAssertElemCss[i]);\n' +
            '}',
        ],
        'wait': false,
        'checkResult': true,
    });

    // XPath
    x.assert(func('("//a", {"a": 1})'), {
        'instructions': [
            'let parseAssertElemCss = await page.$x("//a");\n' +
            'if (parseAssertElemCss.length === 0) { throw \'XPath "//a" not found\'; }\n' +
            'parseAssertElemCss = parseAssertElemCss[0];\n' +
            'await page.evaluate(e => {\n' +
            'let assertComputedStyle = getComputedStyle(e);\n' +
            'const parseAssertElemCssDict = {"a":"1"};\n' +
            'for (const [parseAssertElemCssKey, parseAssertElemCssValue] of ' +
            'Object.entries(parseAssertElemCssDict)) {\n' +
            'try {\n' +
            'if (e.style[parseAssertElemCssKey] != parseAssertElemCssValue && ' +
            'assertComputedStyle[parseAssertElemCssKey] != parseAssertElemCssValue) {\n' +
            'throw \'expected `\' + parseAssertElemCssValue + \'` for key `\' + ' +
            'parseAssertElemCssKey + \'` for XPath `//a`, found `\' + ' +
            'assertComputedStyle[parseAssertElemCssKey] + \'`\';\n' +
            '}\n' +
            '} catch(e) { continue; } throw "assert didn\'t fail";\n' +
            '}\n' +
            '}, parseAssertElemCss);',
        ],
        'wait': false,
        'checkResult': true,
    });
    x.assert(func('("//a", {"a": 1}, ALL)'), {
        'instructions': [
            'let parseAssertElemCss = await page.$x("//a");\n' +
            'if (parseAssertElemCss.length === 0) { throw \'XPath "//a" not found\'; }\n' +
            'for (let i = 0, len = parseAssertElemCss.length; i < len; ++i) {\n' +
            'await page.evaluate(e => {\n' +
            'let assertComputedStyle = getComputedStyle(e);\n' +
            'const parseAssertElemCssDict = {"a":"1"};\n' +
            'for (const [parseAssertElemCssKey, parseAssertElemCssValue] of ' +
            'Object.entries(parseAssertElemCssDict)) {\n' +
            'try {\n' +
            'if (e.style[parseAssertElemCssKey] != parseAssertElemCssValue && ' +
            'assertComputedStyle[parseAssertElemCssKey] != parseAssertElemCssValue) {\n' +
            'throw \'expected `\' + parseAssertElemCssValue + \'` for key `\' + ' +
            'parseAssertElemCssKey + \'` for XPath `//a`, found `\' + ' +
            'assertComputedStyle[parseAssertElemCssKey] + \'`\';\n' +
            '}\n' +
            '} catch(e) { continue; } throw "assert didn\'t fail";\n' +
            '}\n' +
            '}, parseAssertElemCss[i]);\n' +
            '}',
        ],
        'wait': false,
        'checkResult': true,
    });
    x.assert(func('("//a", {"a": 1, "b": 2})'), {
        'instructions': [
            'let parseAssertElemCss = await page.$x("//a");\n' +
            'if (parseAssertElemCss.length === 0) { throw \'XPath "//a" not found\'; }\n' +
            'parseAssertElemCss = parseAssertElemCss[0];\n' +
            'await page.evaluate(e => {\n' +
            'let assertComputedStyle = getComputedStyle(e);\n' +
            'const parseAssertElemCssDict = {"a":"1","b":"2"};\n' +
            'for (const [parseAssertElemCssKey, parseAssertElemCssValue] of ' +
            'Object.entries(parseAssertElemCssDict)) {\n' +
            'try {\n' +
            'if (e.style[parseAssertElemCssKey] != parseAssertElemCssValue && ' +
            'assertComputedStyle[parseAssertElemCssKey] != parseAssertElemCssValue) {\n' +
            'throw \'expected `\' + parseAssertElemCssValue + \'` for key `\' + ' +
            'parseAssertElemCssKey + \'` for XPath `//a`, found `\' + ' +
            'assertComputedStyle[parseAssertElemCssKey] + \'`\';\n' +
            '}\n' +
            '} catch(e) { continue; } throw "assert didn\'t fail";\n' +
            '}\n' +
            '}, parseAssertElemCss);',
        ],
        'wait': false,
        'checkResult': true,
    });
    x.assert(func('("//a", {"a": 1, "b": 2}, ALL)'), {
        'instructions': [
            'let parseAssertElemCss = await page.$x("//a");\n' +
            'if (parseAssertElemCss.length === 0) { throw \'XPath "//a" not found\'; }\n' +
            'for (let i = 0, len = parseAssertElemCss.length; i < len; ++i) {\n' +
            'await page.evaluate(e => {\n' +
            'let assertComputedStyle = getComputedStyle(e);\n' +
            'const parseAssertElemCssDict = {"a":"1","b":"2"};\n' +
            'for (const [parseAssertElemCssKey, parseAssertElemCssValue] of ' +
            'Object.entries(parseAssertElemCssDict)) {\n' +
            'try {\n' +
            'if (e.style[parseAssertElemCssKey] != parseAssertElemCssValue && ' +
            'assertComputedStyle[parseAssertElemCssKey] != parseAssertElemCssValue) {\n' +
            'throw \'expected `\' + parseAssertElemCssValue + \'` for key `\' + ' +
            'parseAssertElemCssKey + \'` for XPath `//a`, found `\' + ' +
            'assertComputedStyle[parseAssertElemCssKey] + \'`\';\n' +
            '}\n' +
            '} catch(e) { continue; } throw "assert didn\'t fail";\n' +
            '}\n' +
            '}, parseAssertElemCss[i]);\n' +
            '}',
        ],
        'wait': false,
        'checkResult': true,
    });
}

function checkAssertPropertyInner(x, func, before, after) {
    x.assert(func('("a", "b", )'), {'error': 'unexpected `,` after `"b"`'});
    x.assert(func('("a", "b")'), {
        'error': 'expected JSON dictionary as second argument, found `"b"`',
    });
    x.assert(func('("a", "b" "c")'), {'error': 'expected `,`, found `"`'});
    x.assert(func('("a", "b" "c", ALL)'), {'error': 'expected `,`, found `"`'});
    x.assert(func('("a", "b", "c")'), {
        'error': 'expected JSON dictionary as second argument, found `"b"`',
    });
    x.assert(func('("a::after", {"a": 1}, all)'), {
        'error': 'expected identifier `ALL` as third argument or nothing, found `all`',
    });
    x.assert(func('("a::after", {"a": 1}, ALLO)'), {
        'error': 'expected identifier `ALL` as third argument or nothing, found `ALLO`',
    });
    x.assert(func('("a", {"b": "c", "b": "d"})'), {'error': 'property `b` is duplicated'});
    x.assert(func('("a", {"b": []})'), {
        'error': 'only string and number are allowed, found `[]` (an array)',
    });
    x.assert(func('("a", {"b": gateau})'), {
        'error': 'only string and number are allowed, found `gateau` (an ident)',
    });

    x.assert(func('("a", {"a": 1})'), {
        'instructions': [
            'let parseAssertElemProp = await page.$("a");\n' +
            'if (parseAssertElemProp === null) { throw \'"a" not found\'; }\n' +
            'await parseAssertElemProp.evaluateHandle(e => {\n' +
            'const parseAssertElemPropDict = {"a":"1"};\n' +
            'for (const [parseAssertElemPropKey, parseAssertElemPropValue] of ' +
            'Object.entries(parseAssertElemPropDict)) {\n' +
            before +
            'if (e[parseAssertElemPropKey] === undefined || ' +
            'String(e[parseAssertElemPropKey]) != parseAssertElemPropValue) {\n' +
            'throw \'expected `\' + parseAssertElemPropValue + \'` for property `\' + ' +
            'parseAssertElemPropKey + \'` for selector `a`, found `\' + ' +
            'e[parseAssertElemPropKey] + \'`\';\n' +
            '}\n' +
            after +
            '}\n' +
            '});',
        ],
        'wait': false,
        'checkResult': true,
    });
    x.assert(func('("a", {"a": 1}, ALL)'), {
        'instructions': [
            'let parseAssertElemProp = await page.$$("a");\n' +
            'if (parseAssertElemProp.length === 0) { throw \'"a" not found\'; }\n' +
            'for (let i = 0, len = parseAssertElemProp.length; i < len; ++i) {\n' +
            'await parseAssertElemProp[i].evaluateHandle(e => {\n' +
            'const parseAssertElemPropDict = {"a":"1"};\n' +
            'for (const [parseAssertElemPropKey, parseAssertElemPropValue] of ' +
            'Object.entries(parseAssertElemPropDict)) {\n' +
            before +
            'if (e[parseAssertElemPropKey] === undefined || ' +
            'String(e[parseAssertElemPropKey]) != parseAssertElemPropValue) {\n' +
            'throw \'expected `\' + parseAssertElemPropValue + \'` for property `\' + ' +
            'parseAssertElemPropKey + \'` for selector `a`, found `\' + ' +
            'e[parseAssertElemPropKey] + \'`\';\n' +
            '}\n' +
            after +
            '}\n' +
            '});\n' +
            '}',
        ],
        'wait': false,
        'checkResult': true,
    });

    // Check the handling of pseudo elements
    x.assert(func('("a::after", {"a": 1})'), {
        'instructions': [
            'let parseAssertElemProp = await page.$("a");\n' +
            'if (parseAssertElemProp === null) { throw \'"a" not found\'; }\n' +
            'await parseAssertElemProp.evaluateHandle(e => {\n' +
            'const parseAssertElemPropDict = {"a":"1"};\n' +
            'for (const [parseAssertElemPropKey, parseAssertElemPropValue] of ' +
            'Object.entries(parseAssertElemPropDict)) {\n' +
            before +
            'if (e[parseAssertElemPropKey] === undefined || ' +
            'String(e[parseAssertElemPropKey]) != parseAssertElemPropValue) {\n' +
            'throw \'expected `\' + parseAssertElemPropValue + \'` for property `\' + ' +
            'parseAssertElemPropKey + \'` for selector `a`, found `\' + ' +
            'e[parseAssertElemPropKey] + \'`\';\n' +
            '}\n' +
            after +
            '}\n' +
            '});',
        ],
        'wait': false,
        'checkResult': true,
    });
    x.assert(func('("a::after", {"a": 1}, ALL)'), {
        'instructions': [
            'let parseAssertElemProp = await page.$$("a");\n' +
            'if (parseAssertElemProp.length === 0) { throw \'"a" not found\'; }\n' +
            'for (let i = 0, len = parseAssertElemProp.length; i < len; ++i) {\n' +
            'await parseAssertElemProp[i].evaluateHandle(e => {\n' +
            'const parseAssertElemPropDict = {"a":"1"};\n' +
            'for (const [parseAssertElemPropKey, parseAssertElemPropValue] of ' +
            'Object.entries(parseAssertElemPropDict)) {\n' +
            before +
            'if (e[parseAssertElemPropKey] === undefined || ' +
            'String(e[parseAssertElemPropKey]) != parseAssertElemPropValue) {\n' +
            'throw \'expected `\' + parseAssertElemPropValue + \'` for property `\' + ' +
            'parseAssertElemPropKey + \'` for selector `a`, found `\' + ' +
            'e[parseAssertElemPropKey] + \'`\';\n' +
            '}\n' +
            after +
            '}\n' +
            '});\n' +
            '}',
        ],
        'wait': false,
        'checkResult': true,
    });
    x.assert(func('("a:focus", {"a": 1})'), {
        'instructions': [
            'let parseAssertElemProp = await page.$("a:focus");\n' +
            'if (parseAssertElemProp === null) { throw \'"a:focus" not found\'; }\n' +
            'await parseAssertElemProp.evaluateHandle(e => {\n' +
            'const parseAssertElemPropDict = {"a":"1"};\n' +
            'for (const [parseAssertElemPropKey, parseAssertElemPropValue] of ' +
            'Object.entries(parseAssertElemPropDict)) {\n' +
            before +
            'if (e[parseAssertElemPropKey] === undefined || ' +
            'String(e[parseAssertElemPropKey]) != parseAssertElemPropValue) {\n' +
            'throw \'expected `\' + parseAssertElemPropValue + \'` for property `\' + ' +
            'parseAssertElemPropKey + \'` for selector `a:focus`, found `\' + ' +
            'e[parseAssertElemPropKey] + \'`\';\n' +
            '}\n' +
            after +
            '}\n' +
            '});',
        ],
        'wait': false,
        'checkResult': true,
    });
    x.assert(func('("a:focus", {"a": 1}, ALL)'), {
        'instructions': [
            'let parseAssertElemProp = await page.$$("a:focus");\n' +
            'if (parseAssertElemProp.length === 0) { throw \'"a:focus" not found\'; }\n' +
            'for (let i = 0, len = parseAssertElemProp.length; i < len; ++i) {\n' +
            'await parseAssertElemProp[i].evaluateHandle(e => {\n' +
            'const parseAssertElemPropDict = {"a":"1"};\n' +
            'for (const [parseAssertElemPropKey, parseAssertElemPropValue] of ' +
            'Object.entries(parseAssertElemPropDict)) {\n' +
            before +
            'if (e[parseAssertElemPropKey] === undefined || ' +
            'String(e[parseAssertElemPropKey]) != parseAssertElemPropValue) {\n' +
            'throw \'expected `\' + parseAssertElemPropValue + \'` for property `\' + ' +
            'parseAssertElemPropKey + \'` for selector `a:focus`, found `\' + ' +
            'e[parseAssertElemPropKey] + \'`\';\n' +
            '}\n' +
            after +
            '}\n' +
            '});\n' +
            '}',
        ],
        'wait': false,
        'checkResult': true,
    });
    x.assert(func('("a ::after", {"a": 1})'), {
        'instructions': [
            'let parseAssertElemProp = await page.$("a ::after");\n' +
            'if (parseAssertElemProp === null) { throw \'"a ::after" not found\'; }\n' +
            'await parseAssertElemProp.evaluateHandle(e => {\n' +
            'const parseAssertElemPropDict = {"a":"1"};\n' +
            'for (const [parseAssertElemPropKey, parseAssertElemPropValue] of ' +
            'Object.entries(parseAssertElemPropDict)) {\n' +
            before +
            'if (e[parseAssertElemPropKey] === undefined || ' +
            'String(e[parseAssertElemPropKey]) != parseAssertElemPropValue) {\n' +
            'throw \'expected `\' + parseAssertElemPropValue + \'` for property `\' + ' +
            'parseAssertElemPropKey + \'` for selector `a ::after`, found `\' + ' +
            'e[parseAssertElemPropKey] + \'`\';\n' +
            '}\n' +
            after +
            '}\n' +
            '});',
        ],
        'wait': false,
        'checkResult': true,
    });
    x.assert(func('("a ::after", {"a": 1}, ALL)'), {
        'instructions': [
            'let parseAssertElemProp = await page.$$("a ::after");\n' +
            'if (parseAssertElemProp.length === 0) { throw \'"a ::after" not found\'; }\n' +
            'for (let i = 0, len = parseAssertElemProp.length; i < len; ++i) {\n' +
            'await parseAssertElemProp[i].evaluateHandle(e => {\n' +
            'const parseAssertElemPropDict = {"a":"1"};\n' +
            'for (const [parseAssertElemPropKey, parseAssertElemPropValue] of ' +
            'Object.entries(parseAssertElemPropDict)) {\n' +
            before +
            'if (e[parseAssertElemPropKey] === undefined || ' +
            'String(e[parseAssertElemPropKey]) != parseAssertElemPropValue) {\n' +
            'throw \'expected `\' + parseAssertElemPropValue + \'` for property `\' + ' +
            'parseAssertElemPropKey + \'` for selector `a ::after`, found `\' + ' +
            'e[parseAssertElemPropKey] + \'`\';\n' +
            '}\n' +
            after +
            '}\n' +
            '});\n' +
            '}',
        ],
        'wait': false,
        'checkResult': true,
    });

    // XPath
    x.assert(func('("//a", {"a": 1})'), {
        'instructions': [
            'let parseAssertElemProp = await page.$x("//a");\n' +
            'if (parseAssertElemProp.length === 0) { throw \'XPath "//a" not found\'; }\n' +
            'parseAssertElemProp = parseAssertElemProp[0];\n' +
            'await parseAssertElemProp.evaluateHandle(e => {\n' +
            'const parseAssertElemPropDict = {"a":"1"};\n' +
            'for (const [parseAssertElemPropKey, parseAssertElemPropValue] of ' +
            'Object.entries(parseAssertElemPropDict)) {\n' +
            before +
            'if (e[parseAssertElemPropKey] === undefined || ' +
            'String(e[parseAssertElemPropKey]) != parseAssertElemPropValue) {\n' +
            'throw \'expected `\' + parseAssertElemPropValue + \'` for property `\' + ' +
            'parseAssertElemPropKey + \'` for XPath `//a`, found `\' + ' +
            'e[parseAssertElemPropKey] + \'`\';\n' +
            '}\n' +
            after +
            '}\n' +
            '});',
        ],
        'wait': false,
        'checkResult': true,
    });
    x.assert(func('("//a", {"a": 1}, ALL)'), {
        'instructions': [
            'let parseAssertElemProp = await page.$x("//a");\n' +
            'if (parseAssertElemProp.length === 0) { throw \'XPath "//a" not found\'; }\n' +
            'for (let i = 0, len = parseAssertElemProp.length; i < len; ++i) {\n' +
            'await parseAssertElemProp[i].evaluateHandle(e => {\n' +
            'const parseAssertElemPropDict = {"a":"1"};\n' +
            'for (const [parseAssertElemPropKey, parseAssertElemPropValue] of ' +
            'Object.entries(parseAssertElemPropDict)) {\n' +
            before +
            'if (e[parseAssertElemPropKey] === undefined || ' +
            'String(e[parseAssertElemPropKey]) != parseAssertElemPropValue) {\n' +
            'throw \'expected `\' + parseAssertElemPropValue + \'` for property `\' + ' +
            'parseAssertElemPropKey + \'` for XPath `//a`, found `\' + ' +
            'e[parseAssertElemPropKey] + \'`\';\n' +
            '}\n' +
            after +
            '}\n' +
            '});\n' +
            '}',
        ],
        'wait': false,
        'checkResult': true,
    });
}

function checkAssertProperty(x, func) {
    checkAssertPropertyInner(x, func, '', '');
}

function checkAssertPropertyFalse(x, func) {
    checkAssertPropertyInner(
        x,
        func,
        'try {\n',
        '} catch(e) { continue; } throw "assert didn\'t fail";\n');
}

function checkAssertText(x, func) {
    x.assert(func('(a, "b")'), {
        'error': 'expected first argument to be a CSS selector or an XPath, found an ident',
    });
    x.assert(func('("a", "b"'), {'error': 'expected `)` after `"b"`'});
    x.assert(func('("a", )'), {'error': 'unexpected `,` after `"a"`'});

    x.assert(func('("a", "\'b")'), {
        'instructions': [
            'let parseAssertElemStr = await page.$("a");\n' +
            'if (parseAssertElemStr === null) { throw \'"a" not found\'; }\n' +
            'await page.evaluate(e => {\n' +
            'if (e.tagName.toLowerCase() === "input") {\n' +
            'if (e.value !== "\\\'b") { throw \'"\' + e.value + \'" !== "\\\'b"\'; }\n' +
            '} else if (e.textContent !== "\\\'b") {\n' +
            'throw \'"\' + e.textContent + \'" !== "\\\'b"\'; }\n' +
            '}, parseAssertElemStr);',
        ],
        'wait': false,
        'checkResult': true,
    });
    x.assert(func('("a", "\'b", ALL)'), {
        'instructions': [
            'let parseAssertElemStr = await page.$$("a");\n' +
            'if (parseAssertElemStr.length === 0) { throw \'"a" not found\'; }\n' +
            'for (let i = 0, len = parseAssertElemStr.length; i < len; ++i) {\n' +
            'await page.evaluate(e => {\n' +
            'if (e.tagName.toLowerCase() === "input") {\n' +
            'if (e.value !== "\\\'b") { throw \'"\' + e.value + \'" !== "\\\'b"\'; }\n' +
            '} else if (e.textContent !== "\\\'b") {\n' +
            'throw \'"\' + e.textContent + \'" !== "\\\'b"\'; }\n' +
            '}, parseAssertElemStr[i]);\n' +
            '}'],
        'wait': false,
        'checkResult': true,
    });
    x.assert(func('("a", "b")'), {
        'instructions': [
            'let parseAssertElemStr = await page.$("a");\n' +
            'if (parseAssertElemStr === null) { throw \'"a" not found\'; }\n' +
            'await page.evaluate(e => {\n' +
            'if (e.tagName.toLowerCase() === "input") {\n' +
            'if (e.value !== "b") { throw \'"\' + e.value + \'" !== "b"\'; }\n' +
            '} else if (e.textContent !== "b") {\n' +
            'throw \'"\' + e.textContent + \'" !== "b"\'; }\n' +
            '}, parseAssertElemStr);',
        ],
        'wait': false,
        'checkResult': true,
    });
    x.assert(func('("a", "b", ALL)'), {
        'instructions': [
            'let parseAssertElemStr = await page.$$("a");\n' +
            'if (parseAssertElemStr.length === 0) { throw \'"a" not found\'; }\n' +
            'for (let i = 0, len = parseAssertElemStr.length; i < len; ++i) {\n' +
            'await page.evaluate(e => {\n' +
            'if (e.tagName.toLowerCase() === "input") {\n' +
            'if (e.value !== "b") { throw \'"\' + e.value + \'" !== "b"\'; }\n' +
            '} else if (e.textContent !== "b") {\n' +
            'throw \'"\' + e.textContent + \'" !== "b"\'; }\n' +
            '}, parseAssertElemStr[i]);\n' +
            '}'],
        'wait': false,
        'checkResult': true,
    });

    // XPath
    x.assert(func('("//a", "b")'), {
        'instructions': [
            'let parseAssertElemStr = await page.$x("//a");\n' +
            'if (parseAssertElemStr.length === 0) { throw \'XPath "//a" not found\'; }\n' +
            'parseAssertElemStr = parseAssertElemStr[0];\n' +
            'await page.evaluate(e => {\n' +
            'if (e.tagName.toLowerCase() === "input") {\n' +
            'if (e.value !== "b") { throw \'"\' + e.value + \'" !== "b"\'; }\n' +
            '} else if (e.textContent !== "b") {\n' +
            'throw \'"\' + e.textContent + \'" !== "b"\'; }\n' +
            '}, parseAssertElemStr);',
        ],
        'wait': false,
        'checkResult': true,
    });
    x.assert(func('("//a", "b", ALL)'), {
        'instructions': [
            'let parseAssertElemStr = await page.$x("//a");\n' +
            'if (parseAssertElemStr.length === 0) { throw \'XPath "//a" not found\'; }\n' +
            'for (let i = 0, len = parseAssertElemStr.length; i < len; ++i) {\n' +
            'await page.evaluate(e => {\n' +
            'if (e.tagName.toLowerCase() === "input") {\n' +
            'if (e.value !== "b") { throw \'"\' + e.value + \'" !== "b"\'; }\n' +
            '} else if (e.textContent !== "b") {\n' +
            'throw \'"\' + e.textContent + \'" !== "b"\'; }\n' +
            '}, parseAssertElemStr[i]);\n' +
            '}',
        ],
        'wait': false,
        'checkResult': true,
    });
}

function checkAssertTextFalse(x, func) {
    x.assert(func('("a", )'), {'error': 'unexpected `,` after `"a"`'});
    x.assert(func('("a", "b", )'), {'error': 'unexpected `,` after `"b"`'});
    x.assert(func('("a", "b" "c")'), {'error': 'expected `,`, found `"`'});

    x.assert(func('("a", "\'b")'), {
        'instructions': [
            'let parseAssertElemStr = await page.$("a");\n' +
            'if (parseAssertElemStr === null) { throw \'"a" not found\'; }\n' +
            'try {\n' +
            'await page.evaluate(e => {\n' +
            'if (e.tagName.toLowerCase() === "input") {\n' +
            'if (e.value !== "\\\'b") { throw \'"\' + e.value + \'" !== "\\\'b"\'; }\n' +
            '} else if (e.textContent !== "\\\'b") {\n' +
            'throw \'"\' + e.textContent + \'" !== "\\\'b"\'; }\n' +
            '}, parseAssertElemStr);\n' +
            '} catch(e) { return; } throw "assert didn\'t fail";',
        ],
        'wait': false,
        'checkResult': true,
    });
    x.assert(func('("a", "\'b", ALL)'), {
        'instructions': [
            'let parseAssertElemStr = await page.$$("a");\n' +
            'if (parseAssertElemStr.length === 0) { throw \'"a" not found\'; }\n' +
            'for (let i = 0, len = parseAssertElemStr.length; i < len; ++i) {\n' +
            'try {\n' +
            'await page.evaluate(e => {\n' +
            'if (e.tagName.toLowerCase() === "input") {\n' +
            'if (e.value !== "\\\'b") { throw \'"\' + e.value + \'" !== "\\\'b"\'; }\n' +
            '} else if (e.textContent !== "\\\'b") {\n' +
            'throw \'"\' + e.textContent + \'" !== "\\\'b"\'; }\n' +
            '}, parseAssertElemStr[i]);\n' +
            '} catch(e) { continue; } throw "assert didn\'t fail";\n' +
            '}',
        ],
        'wait': false,
        'checkResult': true,
    });
    x.assert(func('("a", "b")'), {
        'instructions': [
            'let parseAssertElemStr = await page.$("a");\n' +
            'if (parseAssertElemStr === null) { throw \'"a" not found\'; }\n' +
            'try {\n' +
            'await page.evaluate(e => {\n' +
            'if (e.tagName.toLowerCase() === "input") {\n' +
            'if (e.value !== "b") { throw \'"\' + e.value + \'" !== "b"\'; }\n' +
            '} else if (e.textContent !== "b") {\n' +
            'throw \'"\' + e.textContent + \'" !== "b"\'; }\n' +
            '}, parseAssertElemStr);\n' +
            '} catch(e) { return; } throw "assert didn\'t fail";',
        ],
        'wait': false,
        'checkResult': true,
    });
    x.assert(func('("a", "b", ALL)'), {
        'instructions': [
            'let parseAssertElemStr = await page.$$("a");\n' +
            'if (parseAssertElemStr.length === 0) { throw \'"a" not found\'; }\n' +
            'for (let i = 0, len = parseAssertElemStr.length; i < len; ++i) {\n' +
            'try {\n' +
            'await page.evaluate(e => {\n' +
            'if (e.tagName.toLowerCase() === "input") {\n' +
            'if (e.value !== "b") { throw \'"\' + e.value + \'" !== "b"\'; }\n' +
            '} else if (e.textContent !== "b") {\n' +
            'throw \'"\' + e.textContent + \'" !== "b"\'; }\n' +
            '}, parseAssertElemStr[i]);\n' +
            '} catch(e) { continue; } throw "assert didn\'t fail";\n' +
            '}',
        ],
        'wait': false,
        'checkResult': true,
    });

    // XPath
    x.assert(func('("//a", "b")'), {
        'instructions': [
            'let parseAssertElemStr = await page.$x("//a");\n' +
            'if (parseAssertElemStr.length === 0) { throw \'XPath "//a" not found\'; }\n' +
            'parseAssertElemStr = parseAssertElemStr[0];\n' +
            'try {\n' +
            'await page.evaluate(e => {\n' +
            'if (e.tagName.toLowerCase() === "input") {\n' +
            'if (e.value !== "b") { throw \'"\' + e.value + \'" !== "b"\'; }\n' +
            '} else if (e.textContent !== "b") {\n' +
            'throw \'"\' + e.textContent + \'" !== "b"\'; }\n' +
            '}, parseAssertElemStr);\n' +
            '} catch(e) { return; } throw "assert didn\'t fail";',
        ],
        'wait': false,
        'checkResult': true,
    });
    x.assert(func('("//a", "b", ALL)'), {
        'instructions': [
            'let parseAssertElemStr = await page.$x("//a");\n' +
            'if (parseAssertElemStr.length === 0) { throw \'XPath "//a" not found\'; }\n' +
            'for (let i = 0, len = parseAssertElemStr.length; i < len; ++i) {\n' +
            'try {\n' +
            'await page.evaluate(e => {\n' +
            'if (e.tagName.toLowerCase() === "input") {\n' +
            'if (e.value !== "b") { throw \'"\' + e.value + \'" !== "b"\'; }\n' +
            '} else if (e.textContent !== "b") {\n' +
            'throw \'"\' + e.textContent + \'" !== "b"\'; }\n' +
            '}, parseAssertElemStr[i]);\n' +
            '} catch(e) { continue; } throw "assert didn\'t fail";\n' +
            '}',
        ],
        'wait': false,
        'checkResult': true,
    });
}

function checkAttribute(x, func) {
    x.assert(func('"'), {'error': 'expected `"` at the end of the string'});
    x.assert(func('("a", "b"'), {'error': 'expected `)` after `"b"`'});
    x.assert(func('("a")'),
        {'error': 'expected `("CSS selector" or "XPath", "attribute name", "attribute value")` or' +
        ' `("CSS selector" or "XPath", [JSON object])`'});
    x.assert(func('("a", )'), {'error': 'unexpected `,` after `"a"`'});
    x.assert(func('("a", "b", )'), {'error': 'unexpected `,` after `"b"`'});
    x.assert(func('("a", "b" "c")'), {'error': 'expected `,`, found `"`'});
    x.assert(func('("a", )'), {'error': 'unexpected `,` after `"a"`'});
    x.assert(func('("a", "b" "c")'), {'error': 'expected `,`, found `"`'});
    x.assert(func('("a", "b")'), {
        'error': 'expected json as second argument (since there are only two arguments), found ' +
            'a string',
    });
    x.assert(func('("a", "b", "c", ALL)'), {
        'error': 'expected `("CSS selector" or "XPath", "attribute name", "attribute value")` or ' +
            '`("CSS selector" or "XPath", [JSON object])`',
    });

    x.assert(func('("a", "b", "c")'), {
        'instructions': [
            'let parseAttributeElem = await page.$("a");\n' +
            'if (parseAttributeElem === null) { throw \'"a" not found\'; }\n' +
            'await page.evaluate(e => {\n' +
            'e.setAttribute("b","c");\n' +
            '}, parseAttributeElem);',
        ],
    });
    x.assert(func('("a", "\\"b", "c")'), {
        'instructions': [
            'let parseAttributeElem = await page.$("a");\n' +
            'if (parseAttributeElem === null) { throw \'"a" not found\'; }\n' +
            'await page.evaluate(e => {\n' +
            'e.setAttribute("\\"b","c");\n' +
            '}, parseAttributeElem);',
        ],
    });
    x.assert(func('("a", {"b": "c"})'), {
        'instructions': [
            'let parseAttributeElemJson = await page.$("a");\n' +
            'if (parseAttributeElemJson === null) { throw \'"a" not found\'; }\n' +
            'await page.evaluate(e => {\n' +
            'e.setAttribute("b","c");\n' +
            '}, parseAttributeElemJson);',
        ],
    });
    x.assert(func('("a", {"b": "c", "d": "e"})'), {
        'instructions': [
            'let parseAttributeElemJson = await page.$("a");\n' +
            'if (parseAttributeElemJson === null) { throw \'"a" not found\'; }\n' +
            'await page.evaluate(e => {\n' +
            'e.setAttribute("b","c");\n' +
            '}, parseAttributeElemJson);\n' +
            'await page.evaluate(e => {\n' +
            'e.setAttribute("d","e");\n' +
            '}, parseAttributeElemJson);',
        ],
    });

    // XPath
    x.assert(func('("/a", "b", "c")'), { 'error': 'XPath must start with `//`' });

    x.assert(func('("//a", "b", "c")'), {
        'instructions': [
            'let parseAttributeElem = await page.$x("//a");\n' +
            'if (parseAttributeElem.length === 0) { throw \'XPath "//a" not found\'; }\n' +
            'parseAttributeElem = parseAttributeElem[0];\n' +
            'await page.evaluate(e => {\n' +
            'e.setAttribute("b","c");\n' +
            '}, parseAttributeElem);',
        ],
    });
    x.assert(func('("//a", {"b": "c"})'), {
        'instructions': [
            'let parseAttributeElemJson = await page.$x("//a");\n' +
            'if (parseAttributeElemJson.length === 0) { throw \'XPath "//a" not found\'; }\n' +
            'parseAttributeElemJson = parseAttributeElemJson[0];\n' +
            'await page.evaluate(e => {\n' +
            'e.setAttribute("b","c");\n' +
            '}, parseAttributeElemJson);',
        ],
    });
}

function checkClick(x, func) {
    // Check position
    x.assert(func('hello'), {'error': 'expected a position or a CSS selector or an XPath'});
    x.assert(func('()'), {'error': 'unexpected `()`: tuples need at least one argument'});
    x.assert(func('('), {'error': 'expected `)` at the end'});
    x.assert(func('(1)'), {
        'error': 'invalid syntax: expected "([number], [number])", found `(1)`',
    });
    x.assert(func('(1,)'), {'error': 'unexpected `,` after `1`'});
    x.assert(func('(1,2,)'), {'error': 'unexpected `,` after `2`'});
    x.assert(func('(1,,2)'), {'error': 'unexpected `,` after `,`'});
    x.assert(func('(,2)'), {'error': 'unexpected `,` as first element'});
    x.assert(func('(a,2)'), {
        'error': 'invalid syntax: expected "([number], [number])", found `(a,2)`',
    });
    x.assert(func('(-1.0,2)'), {'error': 'expected integer for X position, found float: `-1.0`'});
    x.assert(func('(1.0,2)'), {'error': 'expected integer for X position, found float: `1.0`'});
    x.assert(func('(2,-1.0)'), {'error': 'expected integer for Y position, found float: `-1.0`'});
    x.assert(func('(2,1.0)'), {'error': 'expected integer for Y position, found float: `1.0`'});
    x.assert(func('(1,2)'), {'instructions': ['await page.mouse.click(1,2);']});
    x.assert(func('(-1,2)'), {'instructions': ['await page.mouse.click(-1,2);']});
    x.assert(func('(-2,1)'), {'instructions': ['await page.mouse.click(-2,1);']});

    // Check css selector
    x.assert(func('"'), {'error': 'expected `"` at the end of the string'});
    x.assert(func('\''), {'error': 'expected `\'` at the end of the string'});
    x.assert(func('\'\''), {'error': 'CSS selector cannot be empty', 'isXPath': false});
    x.assert(func('"a"'), {'instructions': ['await page.click("a");']});
    x.assert(func('\'a\''), {'instructions': ['await page.click("a");']});
    x.assert(func('\'"a\''), {'instructions': ['await page.click("\\\\"a");']});

    // XPath
    x.assert(func('"/a"'), {'error': 'XPath must start with `//`'});
    x.assert(func('"//a"'), {
        'instructions': [
            'let parseClickVar = await page.$x("//a");\n' +
            'if (parseClickVar.length === 0) { throw \'XPath "//a" not found\'; }\n' +
            'parseClickVar = parseClickVar[0];\n' +
            'await parseClickVar.click();',
        ],
    });
}

function checkCompareElementsAttributeInner(x, func, before, after) {
    x.assert(
        func('("a", "b", ())'),
        {'error': 'unexpected `()`: tuples need at least one argument'},
    );
    x.assert(
        func('("a", "b", (1))'),
        {'error': 'expected third argument to be an array of string, found a string'},
    );
    x.assert(
        func('("a", "b", ("x", "yo"))'),
        {'error': 'expected third argument to be an array of string, found a string'},
    );
    x.assert(func('"a"'), {'error': 'expected a tuple, found `"a"`'});
    x.assert(func('1'), {'error': 'expected a tuple, found `1`'});
    x.assert(func('()'), {'error': 'unexpected `()`: tuples need at least one argument'});
    x.assert(func('[]'), {'error': 'expected a tuple, found `[]`'});
    x.assert(func('("a")'), {'error': 'expected 3 elements in the tuple, found 1 element'});
    x.assert(func('("a", 1)'),
        {'error': 'expected 3 elements in the tuple, found 2 elements'},
    );
    x.assert(func('("a", "a", "b", "c")'), {
        'error': 'expected 3 elements in the tuple, found 4 elements',
    });
    x.assert(func('("a", "b", 1)'), {
        'error': 'expected third argument to be an array of string, found a string',
    });

    x.assert(func('("a", "b", [\'"data-whatever\'])'), {
        'instructions': [
            'let parseCompareElementsAttr1 = await page.$("a");\n' +
            'if (parseCompareElementsAttr1 === null) { throw \'"a" not found\'; }\n' +
            'let parseCompareElementsAttr2 = await page.$("b");\n' +
            'if (parseCompareElementsAttr2 === null) { throw \'"b" not found\'; }\n' +
            'await page.evaluate((e1, e2) => {\n' +
            'const attributes = ["\\"data-whatever"];\n' +
            'for (let i = 0; i < attributes.length; ++i) {\n' +
            'const attr = attributes[i];\n' +
            before +
            'if (e1.getAttribute(attr) !== e2.getAttribute(attr)) {\n' +
            'throw attr + ": " + e1.getAttribute(attr) + " !== " + e2.getAttribute(attr);\n' +
            '}' + after + '\n' +
            '}\n' +
            '}, parseCompareElementsAttr1, parseCompareElementsAttr2);',
        ],
        'wait': false,
        'checkResult': true,
    });

    // XPath
    x.assert(func('("/a", "b", [\'"data-whatever\'])'), {'error': 'XPath must start with `//`'});
    x.assert(func('("//a", "b", [\'"data-whatever\'])'), {
        'instructions': [
            'let parseCompareElementsAttr1 = await page.$x("//a");\n' +
            'if (parseCompareElementsAttr1.length === 0) { throw \'XPath "//a" not found\'; }\n' +
            'parseCompareElementsAttr1 = parseCompareElementsAttr1[0];\n' +
            'let parseCompareElementsAttr2 = await page.$("b");\n' +
            'if (parseCompareElementsAttr2 === null) { throw \'"b" not found\'; }\n' +
            'await page.evaluate((e1, e2) => {\n' +
            'const attributes = ["\\"data-whatever"];\n' +
            'for (let i = 0; i < attributes.length; ++i) {\n' +
            'const attr = attributes[i];\n' +
            before +
            'if (e1.getAttribute(attr) !== e2.getAttribute(attr)) {\n' +
            'throw attr + ": " + e1.getAttribute(attr) + " !== " + e2.getAttribute(attr);\n' +
            '}' + after + '\n' +
            '}\n' +
            '}, parseCompareElementsAttr1, parseCompareElementsAttr2);',
        ],
        'wait': false,
        'checkResult': true,
    });
    x.assert(func('("a", "//b", [\'"data-whatever\'])'), {
        'instructions': [
            'let parseCompareElementsAttr1 = await page.$("a");\n' +
            'if (parseCompareElementsAttr1 === null) { throw \'"a" not found\'; }\n' +
            'let parseCompareElementsAttr2 = await page.$x("//b");\n' +
            'if (parseCompareElementsAttr2.length === 0) { throw \'XPath "//b" not found\'; }\n' +
            'parseCompareElementsAttr2 = parseCompareElementsAttr2[0];\n' +
            'await page.evaluate((e1, e2) => {\n' +
            'const attributes = ["\\"data-whatever"];\n' +
            'for (let i = 0; i < attributes.length; ++i) {\n' +
            'const attr = attributes[i];\n' +
            before +
            'if (e1.getAttribute(attr) !== e2.getAttribute(attr)) {\n' +
            'throw attr + ": " + e1.getAttribute(attr) + " !== " + e2.getAttribute(attr);\n' +
            '}' + after + '\n' +
            '}\n' +
            '}, parseCompareElementsAttr1, parseCompareElementsAttr2);',
        ],
        'wait': false,
        'checkResult': true,
    });
    x.assert(func('("//a", "//b", [\'"data-whatever\'])'), {
        'instructions': [
            'let parseCompareElementsAttr1 = await page.$x("//a");\n' +
            'if (parseCompareElementsAttr1.length === 0) { throw \'XPath "//a" not found\'; }\n' +
            'parseCompareElementsAttr1 = parseCompareElementsAttr1[0];\n' +
            'let parseCompareElementsAttr2 = await page.$x("//b");\n' +
            'if (parseCompareElementsAttr2.length === 0) { throw \'XPath "//b" not found\'; }\n' +
            'parseCompareElementsAttr2 = parseCompareElementsAttr2[0];\n' +
            'await page.evaluate((e1, e2) => {\n' +
            'const attributes = ["\\"data-whatever"];\n' +
            'for (let i = 0; i < attributes.length; ++i) {\n' +
            'const attr = attributes[i];\n' +
            before +
            'if (e1.getAttribute(attr) !== e2.getAttribute(attr)) {\n' +
            'throw attr + ": " + e1.getAttribute(attr) + " !== " + e2.getAttribute(attr);\n' +
            '}' + after + '\n' +
            '}\n' +
            '}, parseCompareElementsAttr1, parseCompareElementsAttr2);',
        ],
        'wait': false,
        'checkResult': true,
    });
}

function checkCompareElementsAttribute(x, func) {
    checkCompareElementsAttributeInner(x, func, '', '');
}

function checkCompareElementsAttributeFalse(x, func) {
    checkCompareElementsAttributeInner(
        x,
        func,
        'try {\n',
        '\n} catch(e) { continue; } throw "assert didn\'t fail";',
    );
}

function checkCompareElementsCssInner(x, func, before, after) {
    x.assert(
        func('("a", "b", ())'),
        {'error': 'unexpected `()`: tuples need at least one argument'},
    );
    x.assert(
        func('("a", "b", (1))'),
        {'error': 'expected third argument to be an array of string, found a tuple'},
    );
    x.assert(func('"a"'), {'error': 'expected a tuple, found `"a"`'});
    x.assert(func('1'), {'error': 'expected a tuple, found `1`'});
    x.assert(func('()'), {'error': 'unexpected `()`: tuples need at least one argument'});
    x.assert(func('[]'), {'error': 'expected a tuple, found `[]`'});
    x.assert(func('("a")'), {'error': 'expected 3 elements in the tuple, found 1 element'});
    x.assert(func('("a", 1, [])'),
        {'error': 'expected second argument to be a CSS selector or an XPath, found a number'},
    );
    x.assert(func('(1, "a", [])'),
        {'error': 'expected first argument to be a CSS selector or an XPath, found a number'},
    );
    x.assert(func('((), "a", [])'),
        {'error': 'expected first argument to be a CSS selector or an XPath, found a tuple'},
    );
    x.assert(func('("a", "a", "b", "c")'), {
        'error': 'expected 3 elements in the tuple, found 4 elements',
    });
    x.assert(func('("a", "b", 1)'), {
        'error': 'expected third argument to be an array of string, found a number',
    });

    x.assert(func('("a", "b", ["margin"])'), {
        'instructions': [
            'let parseCompareElementsCss1 = await page.$("a");\n' +
            'if (parseCompareElementsCss1 === null) { throw \'"a" not found\'; }\n' +
            'let parseCompareElementsCss2 = await page.$("b");\n' +
            'if (parseCompareElementsCss2 === null) { throw \'"b" not found\'; }\n' +
            'await page.evaluate((e1, e2) => {let computed_style1 = getComputedStyle(e1);\n' +
            'let computed_style2 = getComputedStyle(e2);\n' +
            'const properties = ["margin"];\n' +
            'for (let i = 0; i < properties.length; ++i) {\n' +
            'const css_property = properties[i];\n' +
            before +
            'let style1_1 = e1.style[css_property];\n' +
            'let style1_2 = computed_style1[css_property];\n' +
            'let style2_1 = e2.style[css_property];\n' +
            'let style2_2 = computed_style2[css_property];\n' +
            'if (style1_1 != style2_1 && style1_1 != style2_2 && style1_2 != style2_1 ' +
            '&& style1_2 != style2_2) {\n' +
            'throw \'CSS property `\' + css_property + \'` did not match: \' + style1_2 + \' ' +
            '!= \' + style2_2; }' + after + '\n' +
            '}\n' +
            '}, parseCompareElementsCss1, parseCompareElementsCss2);',
        ],
        'wait': false,
        'checkResult': true,
    });

    // Xpath
    x.assert(func('("//a", "b", ["margin"])'), {
        'instructions': [
            'let parseCompareElementsCss1 = await page.$x("//a");\n' +
            'if (parseCompareElementsCss1.length === 0) { throw \'XPath "//a" not found\'; }\n' +
            'parseCompareElementsCss1 = parseCompareElementsCss1[0];\n' +
            'let parseCompareElementsCss2 = await page.$("b");\n' +
            'if (parseCompareElementsCss2 === null) { throw \'"b" not found\'; }\n' +
            'await page.evaluate((e1, e2) => {let computed_style1 = getComputedStyle(e1);\n' +
            'let computed_style2 = getComputedStyle(e2);\n' +
            'const properties = ["margin"];\n' +
            'for (let i = 0; i < properties.length; ++i) {\n' +
            'const css_property = properties[i];\n' +
            before +
            'let style1_1 = e1.style[css_property];\n' +
            'let style1_2 = computed_style1[css_property];\n' +
            'let style2_1 = e2.style[css_property];\n' +
            'let style2_2 = computed_style2[css_property];\n' +
            'if (style1_1 != style2_1 && style1_1 != style2_2 && style1_2 != style2_1 ' +
            '&& style1_2 != style2_2) {\n' +
            'throw \'CSS property `\' + css_property + \'` did not match: \' + style1_2 + \' ' +
            '!= \' + style2_2; }' + after + '\n' +
            '}\n' +
            '}, parseCompareElementsCss1, parseCompareElementsCss2);',
        ],
        'wait': false,
        'checkResult': true,
    });
    x.assert(func('("a", "//b", ["margin"])'), {
        'instructions': [
            'let parseCompareElementsCss1 = await page.$("a");\n' +
            'if (parseCompareElementsCss1 === null) { throw \'"a" not found\'; }\n' +
            'let parseCompareElementsCss2 = await page.$x("//b");\n' +
            'if (parseCompareElementsCss2.length === 0) { throw \'XPath "//b" not found\'; }\n' +
            'parseCompareElementsCss2 = parseCompareElementsCss2[0];\n' +
            'await page.evaluate((e1, e2) => {let computed_style1 = getComputedStyle(e1);\n' +
            'let computed_style2 = getComputedStyle(e2);\n' +
            'const properties = ["margin"];\n' +
            'for (let i = 0; i < properties.length; ++i) {\n' +
            'const css_property = properties[i];\n' +
            before +
            'let style1_1 = e1.style[css_property];\n' +
            'let style1_2 = computed_style1[css_property];\n' +
            'let style2_1 = e2.style[css_property];\n' +
            'let style2_2 = computed_style2[css_property];\n' +
            'if (style1_1 != style2_1 && style1_1 != style2_2 && style1_2 != style2_1 ' +
            '&& style1_2 != style2_2) {\n' +
            'throw \'CSS property `\' + css_property + \'` did not match: \' + style1_2 + \' ' +
            '!= \' + style2_2; }' + after + '\n' +
            '}\n' +
            '}, parseCompareElementsCss1, parseCompareElementsCss2);',
        ],
        'wait': false,
        'checkResult': true,
    });
    x.assert(func('("//a", "//b", ["margin"])'), {
        'instructions': [
            'let parseCompareElementsCss1 = await page.$x("//a");\n' +
            'if (parseCompareElementsCss1.length === 0) { throw \'XPath "//a" not found\'; }\n' +
            'parseCompareElementsCss1 = parseCompareElementsCss1[0];\n' +
            'let parseCompareElementsCss2 = await page.$x("//b");\n' +
            'if (parseCompareElementsCss2.length === 0) { throw \'XPath "//b" not found\'; }\n' +
            'parseCompareElementsCss2 = parseCompareElementsCss2[0];\n' +
            'await page.evaluate((e1, e2) => {let computed_style1 = getComputedStyle(e1);\n' +
            'let computed_style2 = getComputedStyle(e2);\n' +
            'const properties = ["margin"];\n' +
            'for (let i = 0; i < properties.length; ++i) {\n' +
            'const css_property = properties[i];\n' +
            before +
            'let style1_1 = e1.style[css_property];\n' +
            'let style1_2 = computed_style1[css_property];\n' +
            'let style2_1 = e2.style[css_property];\n' +
            'let style2_2 = computed_style2[css_property];\n' +
            'if (style1_1 != style2_1 && style1_1 != style2_2 && style1_2 != style2_1 ' +
            '&& style1_2 != style2_2) {\n' +
            'throw \'CSS property `\' + css_property + \'` did not match: \' + style1_2 + \' ' +
            '!= \' + style2_2; }' + after + '\n' +
            '}\n' +
            '}, parseCompareElementsCss1, parseCompareElementsCss2);',
        ],
        'wait': false,
        'checkResult': true,
    });
}

function checkCompareElementsCss(x, func) {
    checkCompareElementsCssInner(x, func, '', '');
}

function checkCompareElementsCssFalse(x, func) {
    checkCompareElementsCssInner(
        x,
        func,
        'try {\n',
        '\n} catch(e) { continue; } throw "assert didn\'t fail";',
    );
}

function checkCompareElementsPositionInner(x, func, before, after) {
    x.assert(func('"a"'), {'error': 'expected a tuple, found `"a"`'});
    x.assert(func('1'), {'error': 'expected a tuple, found `1`'});
    x.assert(func('()'), {'error': 'unexpected `()`: tuples need at least one argument'});
    x.assert(func('[]'), {'error': 'expected a tuple, found `[]`'});
    x.assert(func('("a")'), {'error': 'expected 3 elements in the tuple, found 1 element'});
    x.assert(func('("a", 1)'),
        {'error': 'expected 3 elements in the tuple, found 2 elements'},
    );
    x.assert(func('(1, "a", ("a"))'),
        {'error': 'expected first argument to be a CSS selector or an XPath, found a number'},
    );
    x.assert(func('((), "a", ("a"))'),
        {'error': 'expected first argument to be a CSS selector or an XPath, found a tuple'},
    );
    x.assert(func('("a", "a", "b", "c")'), {
        'error': 'expected 3 elements in the tuple, found 4 elements',
    });
    x.assert(func('("a", "b", 1)'), {
        'error': 'expected third argument to be a tuple, found a number',
    });
    x.assert(
        func('("a", "b", ())'),
        {'error': 'unexpected `()`: tuples need at least one argument'},
    );
    x.assert(
        func('("a", "b", (1))'),
        {'error': 'expected an array of strings, found `(1)`'},
    );
    x.assert(
        func('("a", "b", ("x", "yo"))'),
        {'error': 'Only accepted values are "x" and "y", found `"yo"` (in `("x", "yo")`'},
    );

    x.assert(func('("a", "b", ("x"))'), {
        'instructions': [
            'let parseCompareElementsPos1 = await page.$("a");\n' +
            'if (parseCompareElementsPos1 === null) { throw \'"a" not found\'; }\n' +
            'let parseCompareElementsPos2 = await page.$("b");\n' +
            'if (parseCompareElementsPos2 === null) { throw \'"b" not found\'; }\n' +
            before +
            'await page.evaluate((e1, e2) => {\n' +
            'let x1 = e1.getBoundingClientRect().left;\n' +
            'let x2 = e2.getBoundingClientRect().left;\n' +
            'if (x1 !== x2) { throw "different X values: " + x1 + " != " + x2; }\n' +
            '}, parseCompareElementsPos1, parseCompareElementsPos2);' + after,
        ],
        'wait': false,
        'checkResult': true,
    });
    x.assert(func('("a", "b", ("y"))'), {
        'instructions': [
            'let parseCompareElementsPos1 = await page.$("a");\n' +
            'if (parseCompareElementsPos1 === null) { throw \'"a" not found\'; }\n' +
            'let parseCompareElementsPos2 = await page.$("b");\n' +
            'if (parseCompareElementsPos2 === null) { throw \'"b" not found\'; }\n' +
            before +
            'await page.evaluate((e1, e2) => {\n' +
            'let y1 = e1.getBoundingClientRect().top;\n' +
            'let y2 = e2.getBoundingClientRect().top;\n' +
            'if (y1 !== y2) { throw "different Y values: " + y1 + " != " + y2; }\n' +
            '}, parseCompareElementsPos1, parseCompareElementsPos2);' + after,
        ],
        'wait': false,
        'checkResult': true,
    });
    x.assert(func('("a", "b", ("x", "y"))'), {
        'instructions': [
            'let parseCompareElementsPos1 = await page.$("a");\n' +
            'if (parseCompareElementsPos1 === null) { throw \'"a" not found\'; }\n' +
            'let parseCompareElementsPos2 = await page.$("b");\n' +
            'if (parseCompareElementsPos2 === null) { throw \'"b" not found\'; }\n' +
            before +
            'await page.evaluate((e1, e2) => {\n' +
            'let x1 = e1.getBoundingClientRect().left;\n' +
            'let x2 = e2.getBoundingClientRect().left;\n' +
            'if (x1 !== x2) { throw "different X values: " + x1 + " != " + x2; }\n' +
            'let y1 = e1.getBoundingClientRect().top;\n' +
            'let y2 = e2.getBoundingClientRect().top;\n' +
            'if (y1 !== y2) { throw "different Y values: " + y1 + " != " + y2; }\n' +
            '}, parseCompareElementsPos1, parseCompareElementsPos2);' + after,
        ],
        'wait': false,
        'checkResult': true,
    });
    x.assert(func('("a", "b", ("y", "x"))'), {
        'instructions': [
            'let parseCompareElementsPos1 = await page.$("a");\n' +
            'if (parseCompareElementsPos1 === null) { throw \'"a" not found\'; }\n' +
            'let parseCompareElementsPos2 = await page.$("b");\n' +
            'if (parseCompareElementsPos2 === null) { throw \'"b" not found\'; }\n' +
            before +
            'await page.evaluate((e1, e2) => {\n' +
            'let y1 = e1.getBoundingClientRect().top;\n' +
            'let y2 = e2.getBoundingClientRect().top;\n' +
            'if (y1 !== y2) { throw "different Y values: " + y1 + " != " + y2; }\n' +
            'let x1 = e1.getBoundingClientRect().left;\n' +
            'let x2 = e2.getBoundingClientRect().left;\n' +
            'if (x1 !== x2) { throw "different X values: " + x1 + " != " + x2; }\n' +
            '}, parseCompareElementsPos1, parseCompareElementsPos2);' + after,
        ],
        'wait': false,
        'checkResult': true,
    });

    // XPath
    x.assert(func('("//a", "b", ("y", "x"))'), {
        'instructions': [
            'let parseCompareElementsPos1 = await page.$x("//a");\n' +
            'if (parseCompareElementsPos1.length === 0) { throw \'XPath "//a" not found\'; }\n' +
            'parseCompareElementsPos1 = parseCompareElementsPos1[0];\n' +
            'let parseCompareElementsPos2 = await page.$("b");\n' +
            'if (parseCompareElementsPos2 === null) { throw \'"b" not found\'; }\n' +
            before +
            'await page.evaluate((e1, e2) => {\n' +
            'let y1 = e1.getBoundingClientRect().top;\n' +
            'let y2 = e2.getBoundingClientRect().top;\n' +
            'if (y1 !== y2) { throw "different Y values: " + y1 + " != " + y2; }\n' +
            'let x1 = e1.getBoundingClientRect().left;\n' +
            'let x2 = e2.getBoundingClientRect().left;\n' +
            'if (x1 !== x2) { throw "different X values: " + x1 + " != " + x2; }\n' +
            '}, parseCompareElementsPos1, parseCompareElementsPos2);' + after,
        ],
        'wait': false,
        'checkResult': true,
    });
    x.assert(func('("a", "//b", ("y", "x"))'), {
        'instructions': [
            'let parseCompareElementsPos1 = await page.$("a");\n' +
            'if (parseCompareElementsPos1 === null) { throw \'"a" not found\'; }\n' +
            'let parseCompareElementsPos2 = await page.$x("//b");\n' +
            'if (parseCompareElementsPos2.length === 0) { throw \'XPath "//b" not found\'; }\n' +
            'parseCompareElementsPos2 = parseCompareElementsPos2[0];\n' +
            before +
            'await page.evaluate((e1, e2) => {\n' +
            'let y1 = e1.getBoundingClientRect().top;\n' +
            'let y2 = e2.getBoundingClientRect().top;\n' +
            'if (y1 !== y2) { throw "different Y values: " + y1 + " != " + y2; }\n' +
            'let x1 = e1.getBoundingClientRect().left;\n' +
            'let x2 = e2.getBoundingClientRect().left;\n' +
            'if (x1 !== x2) { throw "different X values: " + x1 + " != " + x2; }\n' +
            '}, parseCompareElementsPos1, parseCompareElementsPos2);' + after,
        ],
        'wait': false,
        'checkResult': true,
    });
    x.assert(func('("//a", "//b", ("y", "x"))'), {
        'instructions': [
            'let parseCompareElementsPos1 = await page.$x("//a");\n' +
            'if (parseCompareElementsPos1.length === 0) { throw \'XPath "//a" not found\'; }\n' +
            'parseCompareElementsPos1 = parseCompareElementsPos1[0];\n' +
            'let parseCompareElementsPos2 = await page.$x("//b");\n' +
            'if (parseCompareElementsPos2.length === 0) { throw \'XPath "//b" not found\'; }\n' +
            'parseCompareElementsPos2 = parseCompareElementsPos2[0];\n' +
            before +
            'await page.evaluate((e1, e2) => {\n' +
            'let y1 = e1.getBoundingClientRect().top;\n' +
            'let y2 = e2.getBoundingClientRect().top;\n' +
            'if (y1 !== y2) { throw "different Y values: " + y1 + " != " + y2; }\n' +
            'let x1 = e1.getBoundingClientRect().left;\n' +
            'let x2 = e2.getBoundingClientRect().left;\n' +
            'if (x1 !== x2) { throw "different X values: " + x1 + " != " + x2; }\n' +
            '}, parseCompareElementsPos1, parseCompareElementsPos2);' + after,
        ],
        'wait': false,
        'checkResult': true,
    });
}

function checkCompareElementsPosition(x, func) {
    checkCompareElementsPositionInner(x, func, '', '');
}

function checkCompareElementsPositionFalse(x, func) {
    checkCompareElementsPositionInner(
        x,
        func,
        'try {\n',
        '\n} catch(e) { return; } throw "assert didn\'t fail";',
    );
}

function checkCompareElementsPropertyInner(x, func, before, after) {
    x.assert(
        func('("a", "b", ())'),
        {'error': 'unexpected `()`: tuples need at least one argument'},
    );
    x.assert(
        func('("a", "b", (1))'),
        {'error': 'expected third argument to be an array of string, found a tuple'},
    );
    x.assert(func('"a"'), {'error': 'expected a tuple, found `"a"`'});
    x.assert(func('1'), {'error': 'expected a tuple, found `1`'});
    x.assert(func('()'), {'error': 'unexpected `()`: tuples need at least one argument'});
    x.assert(func('[]'), {'error': 'expected a tuple, found `[]`'});
    x.assert(func('("a")'), {'error': 'expected 3 elements in the tuple, found 1 element'});
    x.assert(func('("a", 1, [])'),
        {'error': 'expected second argument to be a CSS selector or an XPath, found a number'},
    );
    x.assert(func('(1, "a", [])'),
        {'error': 'expected first argument to be a CSS selector or an XPath, found a number'},
    );
    x.assert(func('((), "a", [])'),
        {'error': 'expected first argument to be a CSS selector or an XPath, found a tuple'},
    );
    x.assert(func('("a", "a", "b", "c")'), {
        'error': 'expected 3 elements in the tuple, found 4 elements',
    });
    x.assert(func('("a", "b", 1)'), {
        'error': 'expected third argument to be an array of string, found a number',
    });

    x.assert(func('("a", "b", ["margin"])'), {
        'instructions': [
            'let parseCompareElementsProp1 = await page.$("a");\n' +
            'if (parseCompareElementsProp1 === null) { throw \'"a" not found\'; }\n' +
            'let parseCompareElementsProp2 = await page.$("b");\n' +
            'if (parseCompareElementsProp2 === null) { throw \'"b" not found\'; }\n' +
            'const parseCompareElementsProps = ["margin"];\n' +
            'for (let i = 0; i < parseCompareElementsProps.length; ++i) {\n' +
            'const property = parseCompareElementsProps[i];\n' +
            before +
            'const value = await parseCompareElementsProp1.evaluateHandle((e, p) => {\n' +
            'return String(e[p]);\n' +
            '}, property);\n' +
            'await parseCompareElementsProp2.evaluateHandle((e, v, p) => {\n' +
            'if (v !== String(e[p])) {\n' +
            'throw p + ": `" + v + "` !== `" + String(e[p]) + "`";\n' +
            '}\n' +
            '}, value, property);\n' +
            after +
            '}',
        ],
        'wait': false,
        'checkResult': true,
    });

    // Xpath
    x.assert(func('("//a", "b", ["margin"])'), {
        'instructions': [
            'let parseCompareElementsProp1 = await page.$x("//a");\n' +
            'if (parseCompareElementsProp1.length === 0) { throw \'XPath "//a" not found\'; }\n' +
            'parseCompareElementsProp1 = parseCompareElementsProp1[0];\n' +
            'let parseCompareElementsProp2 = await page.$("b");\n' +
            'if (parseCompareElementsProp2 === null) { throw \'"b" not found\'; }\n' +
            'const parseCompareElementsProps = ["margin"];\n' +
            'for (let i = 0; i < parseCompareElementsProps.length; ++i) {\n' +
            'const property = parseCompareElementsProps[i];\n' +
            before +
            'const value = await parseCompareElementsProp1.evaluateHandle((e, p) => {\n' +
            'return String(e[p]);\n' +
            '}, property);\n' +
            'await parseCompareElementsProp2.evaluateHandle((e, v, p) => {\n' +
            'if (v !== String(e[p])) {\n' +
            'throw p + ": `" + v + "` !== `" + String(e[p]) + "`";\n' +
            '}\n' +
            '}, value, property);\n' +
            after +
            '}',
        ],
        'wait': false,
        'checkResult': true,
    });
    x.assert(func('("a", "//b", ["margin"])'), {
        'instructions': [
            'let parseCompareElementsProp1 = await page.$("a");\n' +
            'if (parseCompareElementsProp1 === null) { throw \'"a" not found\'; }\n' +
            'let parseCompareElementsProp2 = await page.$x("//b");\n' +
            'if (parseCompareElementsProp2.length === 0) { throw \'XPath "//b" not found\'; }\n' +
            'parseCompareElementsProp2 = parseCompareElementsProp2[0];\n' +
            'const parseCompareElementsProps = ["margin"];\n' +
            'for (let i = 0; i < parseCompareElementsProps.length; ++i) {\n' +
            'const property = parseCompareElementsProps[i];\n' +
            before +
            'const value = await parseCompareElementsProp1.evaluateHandle((e, p) => {\n' +
            'return String(e[p]);\n' +
            '}, property);\n' +
            'await parseCompareElementsProp2.evaluateHandle((e, v, p) => {\n' +
            'if (v !== String(e[p])) {\n' +
            'throw p + ": `" + v + "` !== `" + String(e[p]) + "`";\n' +
            '}\n' +
            '}, value, property);\n' +
            after +
            '}',
        ],
        'wait': false,
        'checkResult': true,
    });
    x.assert(func('("//a", "//b", ["margin"])'), {
        'instructions': [
            'let parseCompareElementsProp1 = await page.$x("//a");\n' +
            'if (parseCompareElementsProp1.length === 0) { throw \'XPath "//a" not found\'; }\n' +
            'parseCompareElementsProp1 = parseCompareElementsProp1[0];\n' +
            'let parseCompareElementsProp2 = await page.$x("//b");\n' +
            'if (parseCompareElementsProp2.length === 0) { throw \'XPath "//b" not found\'; }\n' +
            'parseCompareElementsProp2 = parseCompareElementsProp2[0];\n' +
            'const parseCompareElementsProps = ["margin"];\n' +
            'for (let i = 0; i < parseCompareElementsProps.length; ++i) {\n' +
            'const property = parseCompareElementsProps[i];\n' +
            before +
            'const value = await parseCompareElementsProp1.evaluateHandle((e, p) => {\n' +
            'return String(e[p]);\n' +
            '}, property);\n' +
            'await parseCompareElementsProp2.evaluateHandle((e, v, p) => {\n' +
            'if (v !== String(e[p])) {\n' +
            'throw p + ": `" + v + "` !== `" + String(e[p]) + "`";\n' +
            '}\n' +
            '}, value, property);\n' +
            after +
            '}',
        ],
        'wait': false,
        'checkResult': true,
    });
}

function checkCompareElementsProperty(x, func) {
    checkCompareElementsPropertyInner(x, func, '', '');
}

function checkCompareElementsPropertyFalse(x, func) {
    checkCompareElementsPropertyInner(
        x,
        func,
        'try {\n',
        '} catch(e) { continue; } throw "assert didn\'t fail";\n',
    );
}

function checkCompareElementsTextInner(x, func, before, after) {
    x.assert(func('"a"'), {'error': 'expected a tuple of CSS selector/XPath, found `"a"`'});
    x.assert(func('1'), {'error': 'expected a tuple of CSS selector/XPath, found `1`'});
    x.assert(func('()'), {'error': 'unexpected `()`: tuples need at least one argument'});
    x.assert(func('[]'), {'error': 'expected a tuple of CSS selector/XPath, found `[]`'});
    x.assert(func('("a")'), {'error': 'expected 2 CSS selectors/XPathes, found 1 element'});
    x.assert(func('("a", 1)'),
        {'error': 'expected second argument to be a CSS selector or an XPath, found a number'},
    );
    x.assert(func('(1, "a")'),
        {'error': 'expected first argument to be a CSS selector or an XPath, found a number'},
    );
    x.assert(func('((), "a")'),
        {'error': 'expected first argument to be a CSS selector or an XPath, found a tuple'},
    );
    x.assert(func('("a", "a", "b", "c")'), {
        'error': 'expected 2 CSS selectors/XPathes, found 4 elements',
    });
    x.assert(func('("a", "b", 1)'), {
        'error': 'expected 2 CSS selectors/XPathes, found 3 elements',
    });

    x.assert(func('("a", "b")'), {
        'instructions': [
            'let parseCompareElementsText1 = await page.$("a");\n' +
            'if (parseCompareElementsText1 === null) { throw \'"a" not found\'; }\n' +
            'let parseCompareElementsText2 = await page.$("b");\n' +
            'if (parseCompareElementsText2 === null) { throw \'"b" not found\'; }\n' +
            before +
            'await page.evaluate((e1, e2) => {\n' +
            'let e1value;\n' +
            'if (e1.tagName.toLowerCase() === "input") {\n' +
            'e1value = e1.value;\n' +
            '} else {\n' +
            'e1value = e1.textContent;\n' +
            '}\n' +
            'if (e2.tagName.toLowerCase() === "input") {\n' +
            'if (e2.value !== e1value) {\n' +
            'throw \'"\' + e1value + \'" !== "\' + e2.value + \'"\';\n' +
            '}\n' +
            '} else if (e2.textContent !== e1value) {\n' +
            'throw \'"\' + e1value + \'" !== "\' + e2.textContent + \'"\';\n' +
            '}\n}, parseCompareElementsText1, parseCompareElementsText2);' + after,
        ],
        'wait': false,
        'checkResult': true,
    });

    // XPath
    x.assert(func('("//a", "b")'), {
        'instructions': [
            'let parseCompareElementsText1 = await page.$x("//a");\n' +
            'if (parseCompareElementsText1.length === 0) { throw \'XPath "//a" not found\'; }\n' +
            'parseCompareElementsText1 = parseCompareElementsText1[0];\n' +
            'let parseCompareElementsText2 = await page.$("b");\n' +
            'if (parseCompareElementsText2 === null) { throw \'"b" not found\'; }\n' +
            before +
            'await page.evaluate((e1, e2) => {\n' +
            'let e1value;\n' +
            'if (e1.tagName.toLowerCase() === "input") {\n' +
            'e1value = e1.value;\n' +
            '} else {\n' +
            'e1value = e1.textContent;\n' +
            '}\n' +
            'if (e2.tagName.toLowerCase() === "input") {\n' +
            'if (e2.value !== e1value) {\n' +
            'throw \'"\' + e1value + \'" !== "\' + e2.value + \'"\';\n' +
            '}\n' +
            '} else if (e2.textContent !== e1value) {\n' +
            'throw \'"\' + e1value + \'" !== "\' + e2.textContent + \'"\';\n' +
            '}\n}, parseCompareElementsText1, parseCompareElementsText2);' + after,
        ],
        'wait': false,
        'checkResult': true,
    });
    x.assert(func('("a", "//b")'), {
        'instructions': [
            'let parseCompareElementsText1 = await page.$("a");\n' +
            'if (parseCompareElementsText1 === null) { throw \'"a" not found\'; }\n' +
            'let parseCompareElementsText2 = await page.$x("//b");\n' +
            'if (parseCompareElementsText2.length === 0) { throw \'XPath "//b" not found\'; }\n' +
            'parseCompareElementsText2 = parseCompareElementsText2[0];\n' +
            before +
            'await page.evaluate((e1, e2) => {\n' +
            'let e1value;\n' +
            'if (e1.tagName.toLowerCase() === "input") {\n' +
            'e1value = e1.value;\n' +
            '} else {\n' +
            'e1value = e1.textContent;\n' +
            '}\n' +
            'if (e2.tagName.toLowerCase() === "input") {\n' +
            'if (e2.value !== e1value) {\n' +
            'throw \'"\' + e1value + \'" !== "\' + e2.value + \'"\';\n' +
            '}\n' +
            '} else if (e2.textContent !== e1value) {\n' +
            'throw \'"\' + e1value + \'" !== "\' + e2.textContent + \'"\';\n' +
            '}\n}, parseCompareElementsText1, parseCompareElementsText2);' + after,
        ],
        'wait': false,
        'checkResult': true,
    });
    x.assert(func('("//a", "//b")'), {
        'instructions': [
            'let parseCompareElementsText1 = await page.$x("//a");\n' +
            'if (parseCompareElementsText1.length === 0) { throw \'XPath "//a" not found\'; }\n' +
            'parseCompareElementsText1 = parseCompareElementsText1[0];\n' +
            'let parseCompareElementsText2 = await page.$x("//b");\n' +
            'if (parseCompareElementsText2.length === 0) { throw \'XPath "//b" not found\'; }\n' +
            'parseCompareElementsText2 = parseCompareElementsText2[0];\n' +
            before +
            'await page.evaluate((e1, e2) => {\n' +
            'let e1value;\n' +
            'if (e1.tagName.toLowerCase() === "input") {\n' +
            'e1value = e1.value;\n' +
            '} else {\n' +
            'e1value = e1.textContent;\n' +
            '}\n' +
            'if (e2.tagName.toLowerCase() === "input") {\n' +
            'if (e2.value !== e1value) {\n' +
            'throw \'"\' + e1value + \'" !== "\' + e2.value + \'"\';\n' +
            '}\n' +
            '} else if (e2.textContent !== e1value) {\n' +
            'throw \'"\' + e1value + \'" !== "\' + e2.textContent + \'"\';\n' +
            '}\n}, parseCompareElementsText1, parseCompareElementsText2);' + after,
        ],
        'wait': false,
        'checkResult': true,
    });
}

function checkCompareElementsText(x, func) {
    checkCompareElementsTextInner(x, func, '', '');
}

function checkCompareElementsTextFalse(x, func) {
    checkCompareElementsTextInner(
        x,
        func,
        'try {\n',
        '\n} catch(e) { return; } throw "assert didn\'t fail";',
    );
}

function checkCss(x, func) {
    x.assert(func('"'), {'error': 'expected `"` at the end of the string'});
    x.assert(func('("a", "b"'), {'error': 'expected `)` after `"b"`'});
    x.assert(func('("a")'), {
        'error': 'expected `("CSS selector" or "XPath", "CSS property name", "CSS property value"' +
            ')` or `("CSS selector" or "XPath", [JSON object])`',
    });
    x.assert(func('("a", )'), {'error': 'unexpected `,` after `"a"`'});
    x.assert(func('("a", "b", )'), {'error': 'unexpected `,` after `"b"`'});
    x.assert(func('("a", "b" "c")'), {'error': 'expected `,`, found `"`'});
    x.assert(func('("a", )'), {'error': 'unexpected `,` after `"a"`'});
    x.assert(func('("a", "b" "c")'), {'error': 'expected `,`, found `"`'});
    x.assert(func('("a", "b")'), {
        'error': 'expected json as second argument (since there are only two arguments), found ' +
            'a string',
    });
    x.assert(func('("a", "", "c")'), {'error': 'attribute name (second argument) cannot be empty'});
    x.assert(func('("a", "b", "c")'), {
        'instructions': [
            'let parseCssElem = await page.$("a");\n' +
            'if (parseCssElem === null) { throw \'"a" not found\'; }\n' +
            'await page.evaluate(e => {\n' +
            'e.style["b"] = "c";\n' +
            '}, parseCssElem);',
        ],
    });
    x.assert(func('("a", "\\"b", "c")'), {
        'instructions': [
            'let parseCssElem = await page.$("a");\n' +
            'if (parseCssElem === null) { throw \'"a" not found\'; }\n' +
            'await page.evaluate(e => {\n' +
            'e.style["\\"b"] = "c";\n' +
            '}, parseCssElem);',
        ],
    });
    x.assert(func('("a", {"b": "c"})'), {
        'instructions': [
            'let parseCssElemJson = await page.$("a");\n' +
            'if (parseCssElemJson === null) { throw \'"a" not found\'; }\n' +
            'await page.evaluate(e => {\n' +
            'e.style["b"] = "c";\n' +
            '}, parseCssElemJson);',
        ],
    });
    x.assert(func('("a", {"b": "c", "d": "e"})'), {
        'instructions': [
            'let parseCssElemJson = await page.$("a");\n' +
            'if (parseCssElemJson === null) { throw \'"a" not found\'; }\n' +
            'await page.evaluate(e => {\n' +
            'e.style["b"] = "c";\n' +
            '}, parseCssElemJson);\n' +
            'await page.evaluate(e => {\n' +
            'e.style["d"] = "e";\n' +
            '}, parseCssElemJson);',
        ],
    });

    // XPath
    x.assert(func('("/a", "b", "c")'), { 'error': 'XPath must start with `//`'});
    x.assert(func('("//a", "b", "c")'), {
        'instructions': [
            'let parseCssElem = await page.$x("//a");\n' +
            'if (parseCssElem.length === 0) { throw \'XPath "//a" not found\'; }\n' +
            'parseCssElem = parseCssElem[0];\n' +
            'await page.evaluate(e => {\n' +
            'e.style["b"] = "c";\n' +
            '}, parseCssElem);',
        ],
    });
    x.assert(func('("//a", {"b": "c"})'), {
        'instructions': [
            'let parseCssElemJson = await page.$x("//a");\n' +
            'if (parseCssElemJson.length === 0) { throw \'XPath "//a" not found\'; }\n' +
            'parseCssElemJson = parseCssElemJson[0];\n' +
            'await page.evaluate(e => {\n' +
            'e.style["b"] = "c";\n' +
            '}, parseCssElemJson);',
        ],
    });
}

function checkDebug(x, func) {
    x.assert(func('hello'), {'error': 'expected `true` or `false` value, found `hello`'});
    x.assert(func('"true"'), {'error': 'expected `true` or `false` value, found `"true"`'});
    x.assert(func('tru'), {'error': 'expected `true` or `false` value, found `tru`'});
    x.assert(func('false'), {
        'instructions': [
            'if (arg && arg.debug_log && arg.debug_log.setDebugEnabled) {\n' +
            'arg.debug_log.setDebugEnabled(false);\n' +
            '} else {\n' +
            'throw "`debug` command needs an object with a `debug_log` field of `Debug` type!";\n}',
        ],
        'wait': false,
    });
    x.assert(func('true'), {
        'instructions': [
            'if (arg && arg.debug_log && arg.debug_log.setDebugEnabled) {\n' +
            'arg.debug_log.setDebugEnabled(true);\n' +
            '} else {\n' +
            'throw "`debug` command needs an object with a `debug_log` field of `Debug` type!";\n}',
        ],
        'wait': false,
    });
}

function checkDragAndDrop(x, func) {
    // check tuple argument
    x.assert(func('true'), {
        'error': 'expected tuple with two elements being either a position `(x, y)` or a CSS ' +
            'selector or an XPath',
    });
    x.assert(func('(true)'), {
        'error': 'expected tuple with two elements being either a position `(x, y)` or a CSS ' +
            'selector or an XPath',
    });
    x.assert(func('(1,2)'), {
        'error': 'expected tuple with two elements being either a position `(x, y)` or a CSS ' +
            'selector or an XPath, found `1`',
    });
    x.assert(func('(1,2,3)'), {
        'error': 'expected tuple with two elements being either a position `(x, y)` or a CSS ' +
            'selector or an XPath',
    });
    x.assert(func('("a",2)'), {
        'error': 'expected tuple with two elements being either a position `(x, y)` or a CSS ' +
            'selector or an XPath, found `2`',
    });
    x.assert(func('(1,"a")'), {
        'error': 'expected tuple with two elements being either a position `(x, y)` or a CSS ' +
            'selector or an XPath, found `1`',
    });
    x.assert(func('((1,2,3),"a")'), {
        'error': 'invalid syntax: expected "([number], [number])", found `(1,2,3)`',
    });
    x.assert(func('((1,"a"),"a")'), {
        'error': 'invalid syntax: expected "([number], [number])", found `(1,"a")`',
    });
    x.assert(func('((1,2),"")'), {
        'error': 'CSS selector (second argument) cannot be empty',
        'isXPath': false,
    });
    x.assert(func('("", (1,2))'), {
        'error': 'CSS selector (first argument) cannot be empty',
        'isXPath': false,
    });
    x.assert(func('((-1,2),"")'), {'error': 'X position cannot be negative: `-1`'});
    x.assert(func('((1,-2),"")'), {'error': 'Y position cannot be negative: `-2`'});
    x.assert(func('((1.0,2),"")'), {
        'error': 'expected integer for X position, found float: `1.0`',
    });
    x.assert(func('((-1.0,2),"")'), {
        'error': 'expected integer for X position, found float: `-1.0`',
    });
    x.assert(func('((1,2.0),"")'), {
        'error': 'expected integer for Y position, found float: `2.0`',
    });
    x.assert(func('((1,-2.0),"")'), {
        'error': 'expected integer for Y position, found float: `-2.0`',
    });
    x.assert(func('("a",(-1,2))'), {'error': 'X position cannot be negative: `-1`'});
    x.assert(func('("a",(1,-2))'), {'error': 'Y position cannot be negative: `-2`'});
    x.assert(func('("a",(1.0,2))'), {
        'error': 'expected integer for X position, found float: `1.0`',
    });
    x.assert(func('("a",(-1.0,2))'), {
        'error': 'expected integer for X position, found float: `-1.0`',
    });
    x.assert(func('("a",(1,2.0))'), {
        'error': 'expected integer for Y position, found float: `2.0`',
    });
    x.assert(func('("a",(1,-2.0))'), {
        'error': 'expected integer for Y position, found float: `-2.0`',
    });
    x.assert(func('((1,2),"a")'), {
        'instructions': [
            'const start = [1, 2];\n' +
            'await page.mouse.move(start[0], start[1]);\n' +
            'await page.mouse.down();',
            'let parseDragAndDropElem2 = await page.$("a");\n' +
            'if (parseDragAndDropElem2 === null) { throw \'"a" not found\'; }\n' +
            'const parseDragAndDropElem2_box = await parseDragAndDropElem2.boundingBox();\n' +
            'const end = [parseDragAndDropElem2_box.x + ' +
            'parseDragAndDropElem2_box.width / 2, parseDragAndDropElem2_box.y + ' +
            'parseDragAndDropElem2_box.height / 2];\n' +
            'await page.mouse.move(end[0], end[1]);\n' +
            'await page.mouse.up();',
        ],
    });
    x.assert(func('("a", (1,2))'), {
        'instructions': [
            'let parseDragAndDropElem = await page.$("a");\n' +
            'if (parseDragAndDropElem === null) { throw \'"a" not found\'; }\n' +
            'const parseDragAndDropElem_box = await parseDragAndDropElem.boundingBox();\n' +
            'const start = [parseDragAndDropElem_box.x + ' +
            'parseDragAndDropElem_box.width / 2, parseDragAndDropElem_box.y + ' +
            'parseDragAndDropElem_box.height / 2];\n' +
            'await page.mouse.move(start[0], start[1]);\n' +
            'await page.mouse.down();',
            'const end = [1, 2];\n' +
            'await page.mouse.move(end[0], end[1]);\n' +
            'await page.mouse.up();',
        ],
    });
    x.assert(func('("a", "b")'), {
        'instructions': [
            'let parseDragAndDropElem = await page.$("a");\n' +
            'if (parseDragAndDropElem === null) { throw \'"a" not found\'; }\n' +
            'const parseDragAndDropElem_box = await parseDragAndDropElem.boundingBox();\n' +
            'const start = [parseDragAndDropElem_box.x + parseDragAndDropElem_box.width / 2, ' +
            'parseDragAndDropElem_box.y + parseDragAndDropElem_box.height / 2];\n' +
            'await page.mouse.move(start[0], start[1]);\n' +
            'await page.mouse.down();',
            'let parseDragAndDropElem2 = await page.$("b");\n' +
            'if (parseDragAndDropElem2 === null) { throw \'"b" not found\'; }\n' +
            'const parseDragAndDropElem2_box = await parseDragAndDropElem2.boundingBox();\n' +
            'const end = [parseDragAndDropElem2_box.x + parseDragAndDropElem2_box.width / 2, ' +
            'parseDragAndDropElem2_box.y + parseDragAndDropElem2_box.height / 2];\n' +
            'await page.mouse.move(end[0], end[1]);\n' +
            'await page.mouse.up();',
        ],
    });

    // XPath
    x.assert(func('("/a",(1,2))'), { 'error': 'XPath must start with `//`'});
    x.assert(func('((1,2),"//a")'), {
        'instructions': [
            'const start = [1, 2];\n' +
            'await page.mouse.move(start[0], start[1]);\n' +
            'await page.mouse.down();',
            'let parseDragAndDropElem2 = await page.$x("//a");\n' +
            'if (parseDragAndDropElem2.length === 0) { throw \'XPath "//a" not found\'; }\n' +
            'parseDragAndDropElem2 = parseDragAndDropElem2[0];\n' +
            'const parseDragAndDropElem2_box = await parseDragAndDropElem2.boundingBox();\n' +
            'const end = [parseDragAndDropElem2_box.x + ' +
            'parseDragAndDropElem2_box.width / 2, parseDragAndDropElem2_box.y + ' +
            'parseDragAndDropElem2_box.height / 2];\n' +
            'await page.mouse.move(end[0], end[1]);\n' +
            'await page.mouse.up();',
        ],
    });
    x.assert(func('("//a", (1,2))'), {
        'instructions': [
            'let parseDragAndDropElem = await page.$x("//a");\n' +
            'if (parseDragAndDropElem.length === 0) { throw \'XPath "//a" not found\'; }\n' +
            'parseDragAndDropElem = parseDragAndDropElem[0];\n' +
            'const parseDragAndDropElem_box = await parseDragAndDropElem.boundingBox();\n' +
            'const start = [parseDragAndDropElem_box.x + parseDragAndDropElem_box.width / 2, ' +
            'parseDragAndDropElem_box.y + parseDragAndDropElem_box.height / 2];\n' +
            'await page.mouse.move(start[0], start[1]);\n' +
            'await page.mouse.down();',
            'const end = [1, 2];\n' +
            'await page.mouse.move(end[0], end[1]);\n' +
            'await page.mouse.up();',
        ],
    });
    x.assert(func('("//a", "//b")'), {
        'instructions': [
            'let parseDragAndDropElem = await page.$x("//a");\n' +
            'if (parseDragAndDropElem.length === 0) { throw \'XPath "//a" not found\'; }\n' +
            'parseDragAndDropElem = parseDragAndDropElem[0];\n' +
            'const parseDragAndDropElem_box = await parseDragAndDropElem.boundingBox();\n' +
            'const start = [parseDragAndDropElem_box.x + parseDragAndDropElem_box.width / 2, ' +
            'parseDragAndDropElem_box.y + parseDragAndDropElem_box.height / 2];\n' +
            'await page.mouse.move(start[0], start[1]);\n' +
            'await page.mouse.down();',
            'let parseDragAndDropElem2 = await page.$x("//b");\n' +
            'if (parseDragAndDropElem2.length === 0) { throw \'XPath "//b" not found\'; }\n' +
            'parseDragAndDropElem2 = parseDragAndDropElem2[0];\n' +
            'const parseDragAndDropElem2_box = await parseDragAndDropElem2.boundingBox();\n' +
            'const end = [parseDragAndDropElem2_box.x + parseDragAndDropElem2_box.width / 2, ' +
            'parseDragAndDropElem2_box.y + parseDragAndDropElem2_box.height / 2];\n' +
            'await page.mouse.move(end[0], end[1]);\n' +
            'await page.mouse.up();',
        ],
    });

}

function checkEmulate(x, func) {
    x.assert(func(''), {'error': 'expected string for "device name", found ``'});
    x.assert(func('12'), {'error': 'expected string for "device name", found `12`'});
    x.assert(func('"a"'), {
        'instructions': [
            'if (arg.puppeteer.devices["a"] === undefined) { throw \'Unknown device `a`. List of ' +
            'available devices can be found there: ' +
            'https://github.com/GoogleChrome/puppeteer/blob/master/lib/DeviceDescriptors.js or ' +
            'you can use `--show-devices` option\'; } ' +
            'else { await page.emulate(arg.puppeteer.devices["a"]); }',
        ]});
}

function checkFail(x, func) {
    x.assert(func('hello'), {'error': 'expected `true` or `false` value, found `hello`'});
    x.assert(func('"true"'), {'error': 'expected `true` or `false` value, found `"true"`'});
    x.assert(func('tru'), {'error': 'expected `true` or `false` value, found `tru`'});
    x.assert(func('false'), {'instructions': ['arg.expectedToFail = false;'], 'wait': false});
    x.assert(func('true'), {'instructions': ['arg.expectedToFail = true;'], 'wait': false});
}

function checkFocus(x, func) {
    x.assert(func('a'), {'error': 'expected a CSS selector or an XPath'});
    x.assert(func('"'), {'error': 'expected `"` at the end of the string'});
    x.assert(func('\''), {'error': 'expected `\'` at the end of the string'});
    x.assert(func('\'\''), {
        'error': 'CSS selector cannot be empty',
        'isXPath': false,
    });
    x.assert(func('"a"'), {'instructions': ['await page.focus("a");']});
    x.assert(func('\'a\''), {'instructions': ['await page.focus("a");']});
    x.assert(func('\'"a\''), {'instructions': ['await page.focus("\\\\"a");']});

    // XPath
    x.assert(func('"/a"'), { 'error': 'XPath must start with `//`'});
    x.assert(func('"//a"'), {
        'instructions': [
            'let parseFocusVar = await page.$x("//a");\n' +
            'if (parseFocusVar.length === 0) { throw \'XPath "//a" not found\'; }\n' +
            'parseFocusVar = parseFocusVar[0];\n' +
            'await parseFocusVar.focus();',
        ],
    });
}

function checkGeolocation(x, func) {
    x.assert(func(''), {'error': 'expected (longitude [number], latitude [number]), found ``'});
    x.assert(func('"a"'), {
        'error': 'expected (longitude [number], latitude [number]), found `"a"`',
    });
    x.assert(func('("a", "b")'), {
        'error': 'expected number for longitude (first argument), found `"a"`',
    });
    x.assert(func('("12", 13)'), {
        'error': 'expected number for longitude (first argument), found `"12"`',
    });
    x.assert(func('(12, "13")'), {
        'error': 'expected number for latitude (second argument), found `"13"`',
    });
    x.assert(func('(12, 13)'), {'instructions': ['await page.setGeolocation(12, 13);']});
}

function checkGoTo(x, func) {
    x.assert(func('a'), {'error': 'a relative path or a full URL was expected, found `a`'});
    x.assert(func('"'), {'error': 'a relative path or a full URL was expected, found `"`'});
    x.assert(func('http:/a'),
        {'error': 'a relative path or a full URL was expected, found `http:/a`'});
    x.assert(func('https:/a'),
        {'error': 'a relative path or a full URL was expected, found `https:/a`'});
    x.assert(func('https://a'), {
        'instructions': [
            'await page.goto("https://a");',
            'await arg.browser.overridePermissions(page.url(), arg.permissions);',
        ],
    });
    x.assert(func('www.x'), {
        'instructions': [
            'await page.goto("www.x");',
            'await arg.browser.overridePermissions(page.url(), arg.permissions);',
        ],
    });
    x.assert(func('/a'), {
        'instructions': [
            'await page.goto(page.url().split("/").slice(0, -1).join("/") + "/a");',
            'await arg.browser.overridePermissions(page.url(), arg.permissions);',
        ],
    });
    x.assert(func('./a'), {
        'instructions': [
            'await page.goto(page.url().split("/").slice(0, -1).join("/") + "/./a");',
            'await arg.browser.overridePermissions(page.url(), arg.permissions);',
        ],
    });
    x.assert(func('file:///a'), {
        'instructions': [
            'await page.goto("file:///a");',
            'await arg.browser.overridePermissions(page.url(), arg.permissions);',
        ],
    });
    // `docPath` parameter always ends with '/'
    x.assert(func('file://|doc-path|/a', {'variables': {'doc-path': 'foo'}}), {
        'instructions': [
            'await page.goto("file://foo/a");',
            'await arg.browser.overridePermissions(page.url(), arg.permissions);',
        ],
    });
    x.assert(func('|url|', {'variables': {'url': 'http://foo'}}), {
        'instructions': [
            'await page.goto("http://foo");',
            'await arg.browser.overridePermissions(page.url(), arg.permissions);',
        ],
    });
    x.assert(func('http://foo/|url|fa', {'variables': {'url': 'tadam/'}}), {
        'instructions': [
            'await page.goto("http://foo/tadam/fa");',
            'await arg.browser.overridePermissions(page.url(), arg.permissions);',
        ],
    });
    x.assert(func('http://foo/|url|/fa', {'variables': {'url': 'tadam'}}), {
        'instructions': [
            'await page.goto("http://foo/tadam/fa");',
            'await arg.browser.overridePermissions(page.url(), arg.permissions);',
        ],
    });
    x.assert(func('http://foo/|url|/fa'), {
        'error': 'variable `url` not found in options nor environment',
    });
}

function checkJavascript(x, func) {
    x.assert(func(''), {'error': 'expected `true` or `false` value, found ``'});
    x.assert(func('"a"'), {'error': 'expected `true` or `false` value, found `"a"`'});
    x.assert(func('true'), {
        'instructions': [
            'await page.setJavaScriptEnabled(true);',
        ],
    });
}

function checkLocalStorage(x, func) {
    x.assert(func('hello'), {'error': 'expected JSON'});
    x.assert(func('{').error !== undefined); // JSON syntax error
    x.assert(func('{"a": 1}'), {
        'instructions': ['await page.evaluate(() => { localStorage.setItem("a", "1"); })'],
    });
    x.assert(func('{"a": "1"}'),
        {'instructions': ['await page.evaluate(() => { localStorage.setItem("a", "1"); })']});
    x.assert(func('{"a": "1", "b": "2px"}'),
        {'instructions': ['await page.evaluate(() => { localStorage.setItem("a", "1");\n' +
            'localStorage.setItem("b", "2px"); })']});
}

function checkMoveCursorTo(x, func) {
    // Check position
    x.assert(func('hello'), {'error': 'expected a position or a CSS selector or an XPath'});
    x.assert(func('()'), {'error': 'unexpected `()`: tuples need at least one argument'});
    x.assert(func('('), {'error': 'expected `)` at the end'});
    x.assert(func('(1)'), {
        'error': 'invalid syntax: expected "([number], [number])", found `(1)`',
    });
    x.assert(func('(1,)'), {'error': 'unexpected `,` after `1`'});
    x.assert(func('(1,2,)'), {'error': 'unexpected `,` after `2`'});
    x.assert(func('(1,,2)'), {'error': 'unexpected `,` after `,`'});
    x.assert(func('(,2)'), {'error': 'unexpected `,` as first element'});
    x.assert(func('(a,2)'), {
        'error': 'invalid syntax: expected "([number], [number])", found `(a,2)`',
    });
    x.assert(func('(-1,2)'), {'error': 'X position cannot be negative: `-1`'});
    x.assert(func('(1,-2)'), {'error': 'Y position cannot be negative: `-2`'});
    x.assert(func('(1.0,2)'), {'error': 'expected integer for X position, found float: `1.0`'});
    x.assert(func('(-1.0,2)'), {'error': 'expected integer for X position, found float: `-1.0`'});
    x.assert(func('(2,1.0)'), {'error': 'expected integer for Y position, found float: `1.0`'});
    x.assert(func('(2,-1.0)'), {'error': 'expected integer for Y position, found float: `-1.0`'});
    x.assert(func('(1,2)'), {'instructions': ['await page.mouse.move(1,2);']});

    // Check css selector
    x.assert(func('"'), {'error': 'expected `"` at the end of the string'});
    x.assert(func('\''), {'error': 'expected `\'` at the end of the string'});
    x.assert(func('\'\''), {
        'error': 'CSS selector cannot be empty',
        'isXPath': false,
    });
    x.assert(func('"a"'), {'instructions': ['await page.hover("a");']});
    x.assert(func('\'a\''), {'instructions': ['await page.hover("a");']});
    x.assert(func('\'"a\''), {'instructions': ['await page.hover("\\\\"a");']});

    // XPath
    x.assert(func('"/a"'), { 'error': 'XPath must start with `//`'});
    x.assert(func('"//a"'), {
        'instructions': [
            'let parseMoveCursorToVar = await page.$x("//a");\n' +
            'if (parseMoveCursorToVar.length === 0) { throw \'XPath "//a" not found\'; }\n' +
            'parseMoveCursorToVar = parseMoveCursorToVar[0];\n' +
            'await parseMoveCursorToVar.hover();',
        ],
    });
}

function checkParseContent(x, func) {
    x.assert(func(''), {'instructions': []});
    x.assert(func('// just a comment'), {'instructions': []});
    x.assert(func('  // just a comment'), {'instructions': []});
    x.assert(func('a: '), {'error': 'Unknown command "a"', 'line': 0});
    x.assert(func(':'), {'error': 'Unknown command ""', 'line': 0});

    x.assert(func('goto: file:///home'), {
        'instructions': [
            {
                'code': 'await page.goto("file:///home");',
                'original': 'goto: file:///home',
                'line_number': 1,
            },
            {
                'code': 'await arg.browser.overridePermissions(page.url(), arg.permissions);',
                'original': 'goto: file:///home',
                'line_number': 1,
            },
        ],
    });
    x.assert(func('focus: "#foo"'),
        {
            'error': 'First command must be `goto` (`debug`, `emulate`, `fail`, `javascript`, ' +
                '`screenshot` or `timeout` can be used before)!',
            'line': 1,
        });
    x.assert(func('fail: true\ngoto: file:///home'),
        {
            'instructions': [
                {
                    'code': 'arg.expectedToFail = true;',
                    'wait': false,
                    'original': 'fail: true',
                    'line_number': 1,
                },
                {
                    'code': 'await page.goto("file:///home");',
                    'original': 'goto: file:///home',
                    'line_number': 2,
                },
                {
                    'code': 'await arg.browser.overridePermissions(page.url(), arg.permissions);',
                    'original': 'goto: file:///home',
                    'line_number': 2,
                },
            ],
        });
    x.assert(func('// just a comment\na: b'), {'error': 'Unknown command "a"', 'line': 1});
    x.assert(func('goto: file:///home\nemulate: "test"'),
        {
            'error': 'Command emulate must be used before first goto!',
            'line': 2,
        });
}

function checkPermissions(x, func) {
    x.assert(func(''), {'error': 'expected an array of strings, found ``'});
    x.assert(func('"a"'), {'error': 'expected an array of strings, found `"a"`'});
    x.assert(func('("a", "b")'), {'error': 'expected an array of strings, found `("a", "b")`'});
    x.assert(func('["12", 13]'), {
        'error': 'all array\'s elements must be of the same kind: expected array of `string` ' +
            '(because the first element is of this kind), found `number` at position 1',
    });
    x.assert(func('[12, "13"]'), {
        'error': 'all array\'s elements must be of the same kind: expected array of `number` ' +
            '(because the first element is of this kind), found `string` at position 1',
    });
    x.assert(func('["12"]'), {
        'error': '`"12"` is an unknown permission, you can see the list of available permissions ' +
            'with the `--show-permissions` option',
    });
    x.assert(func('["camera", "push"]'), {
        'instructions': [
            'arg.permissions = ["camera", "push"];',
            'await arg.browser.overridePermissions(page.url(), arg.permissions);',
        ],
    });
}

function checkPressKey(x, func) {
    // check tuple argument
    x.assert(func('"'), {'error': 'expected `"` at the end of the string'});
    x.assert(func('("a", "b"'), {'error': 'expected `)` after `"b"`'});
    x.assert(func('("a")'),
        {'error': 'invalid number of arguments in tuple, expected [string] or [integer] or ' +
                  '([string], [integer]) or ([integer], [integer])'});
    x.assert(func('("a", )'), {'error': 'unexpected `,` after `"a"`'});
    x.assert(func('("a", "b", "c")'),
        {'error': 'invalid number of arguments in tuple, expected [string] or [integer] or ' +
                  '([string], [integer]) or ([integer], [integer])'});
    x.assert(func('("a", "b" "c")'), {'error': 'expected `,`, found `"`'});
    x.assert(func('(\'\', "b")'),
        {'error': 'expected an integer as tuple second argument, found a string'});
    x.assert(func('("a", "b")'),
        {'error': 'expected an integer as tuple second argument, found a string'});
    x.assert(func('("", 13)'), {'error': 'key cannot be empty'});
    x.assert(func('("a", 13.2)'), {'error': 'expected integer for delay, found float: `13.2`'});
    x.assert(func('("a", -13.2)'), {'error': 'expected integer for delay, found float: `-13.2`'});
    x.assert(func('("a", -13)'), {'error': 'delay cannot be negative: `-13`'});
    x.assert(func('("a", 13)'), {
        'instructions': [
            'await page.keyboard.press("a", 13)',
        ],
    });
    x.assert(func('(13, "a")'),
        {'error': 'expected an integer as tuple second argument, found a string'});
    x.assert(func('(-13, 13)'), {'error': 'keycode cannot be negative: `-13`'});
    x.assert(func('(-13.2, 13)'), {'error': 'expected integer for keycode, found float: `-13.2`'});
    x.assert(func('(13.2, 13)'), {'error': 'expected integer for keycode, found float: `13.2`'});
    x.assert(func('(13, 13)'), {
        'instructions': [
            'await page.keyboard.press(String.fromCharCode(13), 13)',
        ],
    });

    // check string argument
    x.assert(func('"'), {'error': 'expected `"` at the end of the string'});
    x.assert(func('\''), {'error': 'expected `\'` at the end of the string'});
    x.assert(func('\'\''), {'error': 'key cannot be empty'});
    x.assert(func('"a"'), {'instructions': ['await page.keyboard.press("a")']});
    x.assert(func('\'a\''), {'instructions': ['await page.keyboard.press("a")']});
    x.assert(func('\'"a\''), {'instructions': ['await page.keyboard.press("\\"a")']});

    // check integer argument
    x.assert(func('13.2'), {'error': 'expected integer for keycode, found float: `13.2`'});
    x.assert(func('-13.2'), {'error': 'expected integer for keycode, found float: `-13.2`'});
    x.assert(func('-13'), {'error': 'keycode cannot be negative: `-13`'});
    x.assert(func('13'), {'instructions': ['await page.keyboard.press(String.fromCharCode(13))']});
}

function checkReload(x, func) {
    // check tuple argument
    x.assert(func(''),
        {
            'instructions': [
                'await page.reload({\'waitUntil\': \'domcontentloaded\', \'timeout\': 30000});',
            ],
        });
    x.assert(func('"a"'), {'error': 'expected either [integer] or no arguments, found a string'});
    x.assert(func('12'),
        {
            'instructions': [
                'await page.reload({\'waitUntil\': \'domcontentloaded\', \'timeout\': 12});',
            ],
        });
    x.assert(func('12 24'), {'error': 'expected nothing, found `2`'});
    x.assert(func('0'),
        {
            'instructions': [
                'await page.reload({\'waitUntil\': \'domcontentloaded\', \'timeout\': 0});',
            ],
            'warnings': 'You passed 0 as timeout, it means the timeout has been disabled on ' +
                'this reload',
        });
    x.assert(func('-12'), {'error': 'timeout cannot be negative: `-12`'});
    x.assert(func('-12.0'), {'error': 'expected integer for timeout, found float: `-12.0`'});
    x.assert(func('12.0'), {'error': 'expected integer for timeout, found float: `12.0`'});
}

function checkScreenshot(x, func) {
    x.assert(func(''), {'error': 'expected boolean or CSS selector or XPath, found nothing'});
    x.assert(func('hello'), {'error': 'expected boolean or CSS selector or XPath, found `hello`'});
    x.assert(func('"true"'),
        {
            'instructions': ['arg.takeScreenshot = "true";'],
            'wait': false,
            'warnings': '`"true"` is a string and will be used as CSS selector. If you want to ' +
                'set `true` or `false` value, remove quotes.',
        });
    x.assert(func('tru'), {'error': 'expected boolean or CSS selector or XPath, found `tru`'});
    x.assert(func('false'), {'instructions': ['arg.takeScreenshot = false;'], 'wait': false});
    x.assert(func('true'), {'instructions': ['arg.takeScreenshot = true;'], 'wait': false});
    x.assert(func('\'\''), {
        'error': 'CSS selector cannot be empty',
        'isXPath': false,
    });
    x.assert(func('"test"'), {'instructions': ['arg.takeScreenshot = "test";'], 'wait': false});

    // XPath
    x.assert(func('"/a"'), { 'error': 'XPath must start with `//`'});
    x.assert(func('"//a"'), {'instructions': ['arg.takeScreenshot = "//a";'], 'wait': false});
}

function checkScrollTo(x, func) {
    // Check position
    x.assert(func('hello'), {'error': 'expected a position or a CSS selector or an XPath'});
    x.assert(func('()'), {'error': 'unexpected `()`: tuples need at least one argument'});
    x.assert(func('('), {'error': 'expected `)` at the end'});
    x.assert(func('(1)'), {
        'error': 'invalid syntax: expected "([number], [number])", found `(1)`',
    });
    x.assert(func('(1,)'), {'error': 'unexpected `,` after `1`'});
    x.assert(func('(1,2,)'), {'error': 'unexpected `,` after `2`'});
    x.assert(func('(1,,2)'), {'error': 'unexpected `,` after `,`'});
    x.assert(func('(,2)'), {'error': 'unexpected `,` as first element'});
    x.assert(func('(a,2)'), {
        'error': 'invalid syntax: expected "([number], [number])", found `(a,2)`',
    });
    x.assert(func('(-1,2)'), {'error': 'X position cannot be negative: `-1`'});
    x.assert(func('(1,-2)'), {'error': 'Y position cannot be negative: `-2`'});
    x.assert(func('(-1.0,2)'), {'error': 'expected integer for X position, found float: `-1.0`'});
    x.assert(func('(1.0,2)'), {'error': 'expected integer for X position, found float: `1.0`'});
    x.assert(func('(2,-1.0)'), {'error': 'expected integer for Y position, found float: `-1.0`'});
    x.assert(func('(2,1.0)'), {'error': 'expected integer for Y position, found float: `1.0`'});
    x.assert(func('(1,2)'), {'instructions': ['await page.mouse.move(1,2);']});

    // Check css selector
    x.assert(func('"'), {'error': 'expected `"` at the end of the string'});
    x.assert(func('\''), {'error': 'expected `\'` at the end of the string'});
    x.assert(func('\'\''), {
        'error': 'CSS selector cannot be empty',
        'isXPath': false,
    });
    x.assert(func('"a"'), {'instructions': ['await page.hover("a");']});
    x.assert(func('\'a\''), {'instructions': ['await page.hover("a");']});
    x.assert(func('\'"a\''), {'instructions': ['await page.hover("\\\\"a");']});

    // XPath
    x.assert(func('"/a"'), { 'error': 'XPath must start with `//`'});
    x.assert(func('"//a"'), {
        'instructions': [
            'let parseMoveCursorToVar = await page.$x("//a");\n' +
            'if (parseMoveCursorToVar.length === 0) { throw \'XPath "//a" not found\'; }\n' +
            'parseMoveCursorToVar = parseMoveCursorToVar[0];\n' +
            'await parseMoveCursorToVar.hover();',
        ],
    });
}

function checkShowText(x, func) {
    x.assert(func('hello'), {'error': 'expected `true` or `false` value, found `hello`'});
    x.assert(func('"true"'), {'error': 'expected `true` or `false` value, found `"true"`'});
    x.assert(func('tru'), {'error': 'expected `true` or `false` value, found `tru`'});
    x.assert(func('false'), {
        'instructions': [
            'arg.showText = false;',
            'await page.evaluate(() => {\n' +
            'window.browserUiCreateNewStyleElement(\'* { color: ' +
            'rgba(0,0,0,0) !important; }\', \'browser-ui-test-style-text-hide\');\n' +
            '});',
        ],
    });
    x.assert(func('true'), {
        'instructions': [
            'arg.showText = true;',
            'await page.evaluate(() => {\n' +
            'let tmp = document.getElementById(\'browser-ui-test-style-text-hide\');\n' +
            'if (tmp) { tmp.remove(); }\n' +
            '});',
        ],
    });
}

function checkSize(x, func) {
    x.assert(func('hello'), {'error': 'expected `([number], [number])`'});
    x.assert(func('()'), {'error': 'unexpected `()`: tuples need at least one argument'});
    x.assert(func('('), {'error': 'expected `)` at the end'});
    x.assert(func('(1)'), {
        'error': 'invalid syntax: expected "([number], [number])", found `(1)`',
    });
    x.assert(func('(1,)'), {'error': 'unexpected `,` after `1`'});
    x.assert(func('(1,2,)'), {'error': 'unexpected `,` after `2`'});
    x.assert(func('(1,,2)'), {'error': 'unexpected `,` after `,`'});
    x.assert(func('(,2)'), {'error': 'unexpected `,` as first element'});
    x.assert(func('(a,2)'), {
        'error': 'invalid syntax: expected "([number], [number])", found `(a,2)`',
    });
    x.assert(func('(1,2)'), {'instructions': ['await page.setViewport({width: 1, height: 2})']});
    x.assert(func('(-1,2)'), {'error': 'width cannot be negative: `-1`'});
    x.assert(func('(1,-2)'), {'error': 'height cannot be negative: `-2`'});
    x.assert(func('(1.0,2)'), {'error': 'expected integer for width, found float: `1.0`'});
    x.assert(func('(-1.0,2)'), {'error': 'expected integer for width, found float: `-1.0`'});
    x.assert(func('(1,2.0)'), {'error': 'expected integer for height, found float: `2.0`'});
    x.assert(func('(1,-2.0)'), {'error': 'expected integer for height, found float: `-2.0`'});
}

function checkText(x, func) {
    x.assert(func('"'), {'error': 'expected `"` at the end of the string'});
    x.assert(func('("a", "b"'), {'error': 'expected `)` after `"b"`'});
    x.assert(func('("a")'), {'error': 'expected `("CSS selector" or "XPath", "text")`'});
    x.assert(func('("a", )'), {'error': 'unexpected `,` after `"a"`'});
    x.assert(func('("a", "b", "c")'), {'error': 'expected `("CSS selector" or "XPath", "text")`'});
    x.assert(func('("a", "b" "c")'), {'error': 'expected `,`, found `"`'});
    x.assert(func('(\'\', "b")'), {
        'error': 'CSS selector cannot be empty',
        'isXPath': false,
    });
    x.assert(func('("a", "b")'),
        {
            'instructions': [
                'let parseTextElem = await page.$("a");\nif (parseTextElem === null) ' +
                '{ throw \'"a" not found\'; }\nawait page.evaluate(e => { e.innerText = "b";}, ' +
                'parseTextElem);',
            ],
        });
}

function checkTimeout(x, func) {
    x.assert(func(''), {'error': 'expected integer for number of milliseconds, found ``'});
    x.assert(func('"a"'), {'error': 'expected integer for number of milliseconds, found `"a"`'});
    x.assert(func('12'), {'instructions': ['page.setDefaultTimeout(12)'], 'wait': false});
    // In case I add a check over no timeout some day...
    x.assert(func('0'), {
        'instructions': ['page.setDefaultTimeout(0)'],
        'wait': false,
        'warnings': [
            'You passed 0 as timeout, it means the timeout has been disabled on this reload',
        ],
    });
    x.assert(func('0.1'), {
        'error': 'expected integer for number of milliseconds, found float: `0.1`',
    });
    x.assert(func('-0.1'), {
        'error': 'expected integer for number of milliseconds, found float: `-0.1`',
    });
    x.assert(func('-1'), {
        'error': 'number of milliseconds cannot be negative: `-1`',
    });
}

function checkWaitFor(x, func) {
    // Check integer
    x.assert(func('hello'), {'error': 'expected an integer or a CSS selector or an XPath'});
    x.assert(func('1 2'), {'error': 'expected nothing, found `2`'});
    x.assert(func('1'), {'instructions': ['await page.waitFor(1)'], 'wait': false});
    x.assert(func('-1'), {'error': 'number of milliseconds cannot be negative: `-1`'});
    x.assert(func('-1.0'), {
        'error': 'expected integer for number of milliseconds, found float: `-1.0`',
    });
    x.assert(func('1.0'), {
        'error': 'expected integer for number of milliseconds, found float: `1.0`',
    });

    // Check css selector
    x.assert(func('"'), {'error': 'expected `"` at the end of the string'});
    x.assert(func('\''), {'error': 'expected `\'` at the end of the string'});
    x.assert(func('\'\''), {
        'error': 'CSS selector cannot be empty',
        'isXPath': false,
    });
    x.assert(func('"a"'), {'instructions': ['await page.waitFor("a")'], 'wait': false});
    x.assert(func('\'a\''), {'instructions': ['await page.waitFor("a")'], 'wait': false});
    x.assert(func('\'"a\''), {'instructions': ['await page.waitFor("\\\\"a")'], 'wait': false});

    // XPath
    x.assert(func('"/a"'), { 'error': 'XPath must start with `//`'});
    x.assert(func('"//a"'), {
        'instructions': ['await page.waitForXPath("//a")'],
        'wait': false,
    });
}

function checkWrite(x, func) {
    // check tuple argument
    x.assert(func('"'), {'error': 'expected `"` at the end of the string'});
    x.assert(func('("a", "b"'), {'error': 'expected `)` after `"b"`'});
    x.assert(func('("a")'), {
        'error': 'invalid number of arguments in tuple, expected "string" or integer or ' +
            '("CSS selector" or "XPath", "string") or ("CSS selector" or "XPath", integer)',
    });
    x.assert(func('("a", )'), {'error': 'unexpected `,` after `"a"`'});
    x.assert(func('("a", "b", "c")'), {
        'error': 'invalid number of arguments in tuple, expected "string" or integer or ' +
            '("CSS selector" or "XPath", "string") or ("CSS selector" or "XPath", integer)',
    });
    x.assert(func('("a", "b" "c")'), {'error': 'expected `,`, found `"`'});
    x.assert(func('(\'\', "b")'), {
        'error': 'CSS selector cannot be empty',
        'isXPath': false,
    });
    x.assert(func('("a", 13.2)'), {'error': 'expected integer for keycode, found float: `13.2`'});
    x.assert(func('("a", -13.2)'), {'error': 'expected integer for keycode, found float: `-13.2`'});
    x.assert(func('("a", -13)'), {'error': 'keycode cannot be negative: `-13`'});
    x.assert(func('("a", "b")'), {'instructions': ['await page.type("a", "b");']});
    x.assert(func('("a", 13)'), {
        'instructions': [
            'await page.focus("a");',
            'await page.keyboard.press(String.fromCharCode(13));',
        ],
    });

    // check string argument
    x.assert(func('"'), {'error': 'expected `"` at the end of the string'});
    x.assert(func('\''), {'error': 'expected `\'` at the end of the string'});
    x.assert(func('\'\''), {'instructions': ['await page.keyboard.type("");']});
    x.assert(func('"a"'), {'instructions': ['await page.keyboard.type("a");']});
    x.assert(func('\'a\''), {'instructions': ['await page.keyboard.type("a");']});
    x.assert(func('\'"a\''), {'instructions': ['await page.keyboard.type("\\"a");']});

    // check integer argument
    x.assert(func('13.2'), {'error': 'expected integer for keycode, found float: `13.2`'});
    x.assert(func('-13.2'), {'error': 'expected integer for keycode, found float: `-13.2`'});
    x.assert(func('-13'), {'error': 'keycode cannot be negative: `-13`'});
    x.assert(func('13'), {'instructions': ['await page.keyboard.press(String.fromCharCode(13));']});

    // XPath
    x.assert(func('("/a", 13)'), { 'error': 'XPath must start with `//`'});
    x.assert(func('("//a", "b")'), {
        'instructions': [
            'let parseWriteVar = await page.$x("//a");\n' +
            'if (parseWriteVar.length === 0) { throw \'XPath "//a" not found\'; }\n' +
            'parseWriteVar = parseWriteVar[0];\n' +
            'await parseWriteVar.type("b");',
        ],
    });
    x.assert(func('("//a", 13)'), {
        'instructions': [
            'let parseWriteVar = await page.$x("//a");\n' +
            'if (parseWriteVar.length === 0) { throw \'XPath "//a" not found\'; }\n' +
            'parseWriteVar = parseWriteVar[0];\n' +
            'parseWriteVar.focus();',
            'await page.keyboard.press(String.fromCharCode(13));',
        ],
    });
}

const TO_CHECK = [
    {
        'name': 'assert',
        'func': checkAssert,
        'toCall': (e, o) => wrapper(parserFuncs.parseAssert, e, o),
    },
    {
        'name': 'assert-false',
        'func': checkAssertFalse,
        'toCall': (e, o) => wrapper(parserFuncs.parseAssertFalse, e, o),
    },
    {
        'name': 'assert-attribute',
        'func': checkAssertAttribute,
        'toCall': (e, o) => wrapper(parserFuncs.parseAssertAttribute, e, o),
    },
    {
        'name': 'assert-attribute-false',
        'func': checkAssertAttributeFalse,
        'toCall': (e, o) => wrapper(parserFuncs.parseAssertAttributeFalse, e, o),
    },
    {
        'name': 'assert-css',
        'func': checkAssertCss,
        'toCall': (e, o) => wrapper(parserFuncs.parseAssertCss, e, o),
    },
    {
        'name': 'assert-css-false',
        'func': checkAssertCssFalse,
        'toCall': (e, o) => wrapper(parserFuncs.parseAssertCssFalse, e, o),
    },
    {
        'name': 'assert-count',
        'func': checkAssertCount,
        'toCall': (e, o) => wrapper(parserFuncs.parseAssertCount, e, o),
    },
    {
        'name': 'assert-count-false',
        'func': checkAssertCountFalse,
        'toCall': (e, o) => wrapper(parserFuncs.parseAssertCountFalse, e, o),
    },
    {
        'name': 'assert-property',
        'func': checkAssertProperty,
        'toCall': (e, o) => wrapper(parserFuncs.parseAssertProperty, e, o),
    },
    {
        'name': 'assert-property-false',
        'func': checkAssertPropertyFalse,
        'toCall': (e, o) => wrapper(parserFuncs.parseAssertPropertyFalse, e, o),
    },
    {
        'name': 'assert-text',
        'func': checkAssertText,
        'toCall': (e, o) => wrapper(parserFuncs.parseAssertText, e, o),
    },
    {
        'name': 'assert-text-false',
        'func': checkAssertTextFalse,
        'toCall': (e, o) => wrapper(parserFuncs.parseAssertTextFalse, e, o),
    },
    {
        'name': 'attribute',
        'func': checkAttribute,
        'toCall': (e, o) => wrapper(parserFuncs.parseAttribute, e, o),
    },
    {
        'name': 'click',
        'func': checkClick,
        'toCall': (e, o) => wrapper(parserFuncs.parseClick, e, o),
    },
    {
        'name': 'compare-elements-attribute',
        'func': checkCompareElementsAttribute,
        'toCall': (e, o) => wrapper(parserFuncs.parseCompareElementsAttribute, e, o),
    },
    {
        'name': 'compare-elements-attribute-false',
        'func': checkCompareElementsAttributeFalse,
        'toCall': (e, o) => wrapper(parserFuncs.parseCompareElementsAttributeFalse, e, o),
    },
    {
        'name': 'compare-elements-css',
        'func': checkCompareElementsCss,
        'toCall': (e, o) => wrapper(parserFuncs.parseCompareElementsCss, e, o),
    },
    {
        'name': 'compare-elements-css-false',
        'func': checkCompareElementsCssFalse,
        'toCall': (e, o) => wrapper(parserFuncs.parseCompareElementsCssFalse, e, o),
    },
    {
        'name': 'compare-elements-position',
        'func': checkCompareElementsPosition,
        'toCall': (e, o) => wrapper(parserFuncs.parseCompareElementsPosition, e, o),
    },
    {
        'name': 'compare-elements-position-false',
        'func': checkCompareElementsPositionFalse,
        'toCall': (e, o) => wrapper(parserFuncs.parseCompareElementsPositionFalse, e, o),
    },
    {
        'name': 'compare-elements-property',
        'func': checkCompareElementsProperty,
        'toCall': (e, o) => wrapper(parserFuncs.parseCompareElementsProperty, e, o),
    },
    {
        'name': 'compare-elements-property-false',
        'func': checkCompareElementsPropertyFalse,
        'toCall': (e, o) => wrapper(parserFuncs.parseCompareElementsPropertyFalse, e, o),
    },
    {
        'name': 'compare-elements-text',
        'func': checkCompareElementsText,
        'toCall': (e, o) => wrapper(parserFuncs.parseCompareElementsText, e, o),
    },
    {
        'name': 'compare-elements-text-false',
        'func': checkCompareElementsTextFalse,
        'toCall': (e, o) => wrapper(parserFuncs.parseCompareElementsTextFalse, e, o),
    },
    {
        'name': 'css',
        'func': checkCss,
        'toCall': (e, o) => wrapper(parserFuncs.parseCss, e, o),
    },
    {
        'name': 'debug',
        'func': checkDebug,
        'toCall': (e, o) => wrapper(parserFuncs.parseDebug, e, o),
    },
    {
        'name': 'drag-and-drop',
        'func': checkDragAndDrop,
        'toCall': (e, o) => wrapper(parserFuncs.parseDragAndDrop, e, o),
    },
    {
        'name': 'emulate',
        'func': checkEmulate,
        'toCall': (e, o) => wrapper(parserFuncs.parseEmulate, e, o),
    },
    {
        'name': 'fail',
        'func': checkFail,
        'toCall': (e, o) => wrapper(parserFuncs.parseFail, e, o),
    },
    {
        'name': 'focus',
        'func': checkFocus,
        'toCall': (e, o) => wrapper(parserFuncs.parseFocus, e, o),
    },
    {
        'name': 'geolocation',
        'func': checkGeolocation,
        'toCall': (e, o) => wrapper(parserFuncs.parseGeolocation, e, o),
    },
    {
        'name': 'goto',
        'func': checkGoTo,
        'toCall': (e, o) => wrapper(parserFuncs.parseGoTo, e, o),
    },
    {
        'name': 'javascript',
        'func': checkJavascript,
        'toCall': (e, o) => wrapper(parserFuncs.parseJavascript, e, o),
    },
    {
        'name': 'local-storage',
        'func': checkLocalStorage,
        'toCall': (e, o) => wrapper(parserFuncs.parseLocalStorage, e, o),
    },
    {
        'name': 'move-cursor-to',
        'func': checkMoveCursorTo,
        'toCall': (e, o) => wrapper(parserFuncs.parseMoveCursorTo, e, o),
    },
    {
        'name': 'permissions',
        'func': checkPermissions,
        'toCall': (e, o) => wrapper(parserFuncs.parsePermissions, e, o),
    },
    {
        'name': 'press-key',
        'func': checkPressKey,
        'toCall': (e, o) => wrapper(parserFuncs.parsePressKey, e, o),
    },
    {
        'name': 'reload',
        'func': checkReload,
        'toCall': (e, o) => wrapper(parserFuncs.parseReload, e, o),
    },
    {
        'name': 'screenshot',
        'func': checkScreenshot,
        'toCall': (e, o) => wrapper(parserFuncs.parseScreenshot, e, o),
    },
    {
        'name': 'scroll-to',
        'func': checkScrollTo,
        'toCall': (e, o) => wrapper(parserFuncs.parseScrollTo, e, o),
    },
    {
        'name': 'show-text',
        'func': checkShowText,
        'toCall': (e, o) => wrapper(parserFuncs.parseShowText, e, o),
    },
    {
        'name': 'size',
        'func': checkSize,
        'toCall': (e, o) => wrapper(parserFuncs.parseSize, e, o),
    },
    {
        'name': 'text',
        'func': checkText,
        'toCall': (e, o) => wrapper(parserFuncs.parseText, e, o),
    },
    {
        'name': 'timeout',
        'func': checkTimeout,
        'toCall': (e, o) => wrapper(parserFuncs.parseTimeout, e, o),
    },
    {
        'name': 'wait-for',
        'func': checkWaitFor,
        'toCall': (e, o) => wrapper(parserFuncs.parseWaitFor, e, o),
    },
    {
        'name': 'write',
        'func': checkWrite,
        'toCall': (e, o) => wrapper(parserFuncs.parseWrite, e, o),
    },
    // This one is a bit "on its own".
    {
        'name': 'parseContent',
        'func': checkParseContent,
        'toCall': (e, o) => wrapper(parserFuncs.parseContent, e, o),
    },
];

async function checkCommands(x = new Assert()) {
    x.startTestSuite('API', false);
    print('=> Starting API tests...');
    print('');

    for (let i = 0; i < TO_CHECK.length; ++i) {
        x.startTestSuite(TO_CHECK[i].name);
        try {
            TO_CHECK[i].func(x, TO_CHECK[i].toCall);
            x.endTestSuite();
        } catch (err) {
            x.endTestSuite(false, true);
            print(`<== "${TO_CHECK[i].name}" failed: ${err}\n${err.stack}`);
        }
    }

    print('');
    print(`<= Ending ${x.getTotalRanTests()} ${plural('test', x.getTotalRanTests())} with ` +
        `${x.getTotalErrors()} ${plural('error', x.getTotalErrors())}`);

    const errors = x.getTotalErrors();
    x.endTestSuite(false);
    return errors;
}

if (require.main === module) {
    checkCommands().then(nbErrors => {
        process.exit(nbErrors !== 0 ? 1 : 0);
    });
} else {
    module.exports = {
        'check': checkCommands,
    };
}
