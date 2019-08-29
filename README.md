# browser-UI-test

Small JS framework to easily provide UI screenshot-based tests.

## Description

This framework provides the possibility to quickly check browser UI through small script files (with the `.goml` extension). Once the script is done, it takes a screenshot of the page and compares it to the expected one. If they're different, the test will fail.

## Usage

You can either use this framework by using it as dependency or running it directly.

### Using this framework as a dependency

You can do so by importing both `runTests` and `Options` from `index.js`. `Options` is a class where you can set the parameters you need/want. If you feel better providing "command-line args"-like parameters, you can use it as follows:

```js
const {Options, runTests} = require('browser-ui-test');

const options = new Options();
try {
    // This is more convenient that setting fields one by one.
    options.parseArguments(['--doc-path', 'somewhere', '--test-folder', 'some-other-place']);
} catch (error) {
    console.error(`invalid argument: ${error}`);
    process.exit(1);
}
```

Then you just pass this `options` variable to the `runTests` function and it's done:

```js
runTests(options).then(x => {
    const [output, nb_failures] = x;
    console.log(output);
    process.exit(nb_failures);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
```

To be noted that there is also a function `runTest` which only runs the specified test file:

```js
const {runTest} = require('browser-ui-test');

runTest('someFile.goml').then(x => {
    const [output, nb_failures] = x;
    console.log(output);
    process.exit(nb_failures);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
```

### Exported elements

Like said above, you can use this framework through code directly. Here is the list of available elements:

 * `runTest`: Function to run a specific test. Parameters:
   * testPath: String [MANDATORY]
   * options: `Options` type [OPTIONAL]
   * saveLogs: Boolean [OPTIONAL]
 * `runTests`: Function to run tests based on the received options. Parameters:
   * options: `Options` type [OPTIONAL]
   * saveLogs: Boolean [OPTIONAL]
 * `Options`: Object used to store run options. More information follows in the [`Options`](#Options) section.

#### Options

If you want to see all the available options, just run with the `-h` or `--help` options. If you want to build the `Options` object yourself, you might be interested by what follows.

The list of fields of the `Options` class is the following:

 * `debug`: display more information
 * `testFolder`: path of the folder where `.goml` script files are
 * `failureFolder`: path of the folder where failed tests image will be placed (`testFolder` value by default)
 * `imageFolder`: path of the folder where screenshots are and where they are generated (`testFolder` value by default)
 * `generateImages`: if provided, it'll generate test images and won't run comparison tests
 * `noHeadless`: disable headless mode
 * `noScreenshot`: disable screenshots generation and comparison at the end of the scripts
 * `testFiles`: list of `.goml` files' path to be run
 * `runId`: id to be used for failed images extension ('test' by default)
 * `showText`: disable text invisibility (be careful when using it!)
 * `variables`: variables to be used in the `.goml` scripts (more information about variables [below](#Variables))
 * `extensions`: extensions to be loaded by the browser
 * `emulate`: name of the device you want to emulate (list of available devices is [here](https://github.com/GoogleChrome/puppeteer/blob/master/lib/DeviceDescriptors.js) or you can use `--show-devices` option)

### Running it directly

You need to pass options through the command line but it's basically the same as doing it with code. Let's run it with the same options as presented above:

```bash
$ node src/index.js --test-folder some-other-place
```

## Font issues

Unfortunately, font rendering differs depending on the computer **and** on the OS. To bypass this problem but still allow to have a global UI check, the text is invisible by default. If you are **sure** that you need to check with the text visible, you can use the option `--show-text`.

## Variables

In this framework, you can use variables defined through the `--variable` option or through your environment. For example, if you start your script with:

```
A_VARIABLE=12 node src/index.js --test-folder tests/scripts/ --variable DOC_PATH tests/html_files --variable ANOTHER_ONE 42
```

You will have three variables that you'll be able to use (since `A_VARIABLE` is available through your environment). Then, to use them in your scripts, you need to put their name between `|` characters:

```
text: ("#an-element", |A_VARIABLE|)
```

In here, it'll set "#an-element" element's text to "12".

A small note: the variable `CURRENT_DIR` is always available (and contains the directory where the script has been started) and **cannot** be override! It is also guaranteed to never end with `/` or `\\`.

## `.goml` scripts

Those scripts aim to be as quick to write and as small as possible. To do so, they provide a short list of commands. Please note that those scripts must **always** start with a [`goto`](#goto) command (non-interactional commands such as `screenshot` or `fail` can be use first as well).

Here's the command list:

 * [`assert`](#assert)
 * [`attribute`](#attribute)
 * [`click`](#click)
 * [`css`](#css)
 * [`drag-and-drop`](#drag-and-drop)
 * [`fail`](#fail)
 * [`focus`](#focus)
 * [`goto`](#goto)
 * [`local-storage`](#local-storage)
 * [`move-cursor-to`](#move-cursor-to)
 * [`reload`](#reload)
 * [`screenshot`](#screenshot)
 * [`scroll-to`](#scroll-to)
 * [`show-text`](#show-text)
 * [`size`](#size)
 * [`text`](#text)
 * [`wait-for`](#wait-for)
 * [`write`](#write)

#### assert

**assert** command checks if the condition is true, otherwise fail. Four different functionalities are available:

```
// will check that "#id > .class" exists
assert: ("#id > .class")
// will check that first "#id > .class" has text "hello"
assert: ("#id > .class", "hello")
// will check that there are 2 "#id > .class"
assert: ("#id > .class", 2)
// will check that "#id > .class" has blue color
assert: ("#id > .class", { "color": "blue" })
// will check that "#id > .class" has an attribute called "attribute-name" with value "attribute-value"
assert: ("#id > .class", "attribute-name", "attribute-value")
```

#### attribute

**attribute** command allows to update an element's attribute. Example:

```
attribute: ("#button", "attribute-name", "attribute-value")
```

To set multiple attributes at a time, you can use a JSON object:

```
attribute: ("#button", {"attribute name": "attribute value", "another": "x"})
```

#### click

**click** command send a click event on an element or at the specified position. It expects a CSS selector or a position. Examples:

```
click: ".element"
click: "#element > a"
click: (10, 12)
```

#### css

**css** command allows to update an element's style. Example:

```
css: ("#button", "background-color", "red")
```

To set multiple styles at a time, you can use a JSON object:

```
css: ("#button", {"background-color": "red", "border": "1px solid"})
```

#### drag-and-drop

**drag-and-drop** command allows to move an element to another place (assuming it implements the necessary JS and is draggable). It expects a tuple of two elements. Each element can be a position or a CSS selector. Example:

```
drag-and-drop: ("#button", "#destination") // move "#button" to where "#destination" is
drag-and-drop: ("#button", (10, 10)) // move "#button" to (10, 10)
drag-and-drop: ((10, 10), "#button") // move the element at (10, 10) to where "#button" is
drag-and-drop: ((10, 10), (20, 35)) // move the element at (10, 10) to (20, 35)
```

#### fail

**fail** command sets a test to be expected to fail (or not). Example:

```
fail: false
```

You can use it as follows too:

```
// text of "#elem" is "hello"
assert: ("#elem", "hello")
text: ("#elem", "not hello")
// we want to check if the text changed (strangely but whatever)
fail: true
assert: ("#elem", "hello")
// now we set it back to false to check the new text
fail: false
assert: ("#elem", "not hello")
```

#### focus

**focus** command focuses (who would have guessed?) on a given element. It expects a CSS selector. Examples:

```
focus: ".element"
focus: "#element"
```

#### goto

**goto** command changes the current page to the given path/url. It expects a path (starting with `.` or `/`) or a URL. Examples:

```
goto: https://test.com
goto: http://test.com
goto: /test
goto: ../test
goto: file://some-location/index.html
```

**/!\\** If you want to use `goto` with `file://`, please remember that you must pass a full path to the web browser (from the root). You can access this information direction with `{current-dir}`:

```
goto: file://{current-dir}/my-folder/index.html
```

If you don't want to rewrite your doc path everytime, you can run the test with the `doc-path` argument and then use it as follow:

```
goto: file://{doc-path}/file.html
```

You can of course use `{doc-path}` and `{current-dir}` at the same time:

```
goto: file://{current-dir}/{doc-path}/file.html
```

#### local-storage

**local-storage** command sets local storage's values. It expect a JSON object. Example:

```
local-storage: {"key": "value", "another key": "another value"}
```

#### move-cursor-to

**move-cursor-to** command moves the mouse cursor to the given position or element. It expects a tuple of integers (`(x, y)`) or a CSS selector. Examples:

```
move-cursor-to: "#element"
move-cursor-to: ".element"
move-cursor-to: (10, 12)
```

#### reload

**reload** command reloads the current page. Example:

```
reload:
reload: 12000 // reload the current page with a timeout of 12 seconds
reload: 0 // disable timeout, be careful when using it!
```

#### screenshot

**screenshot** command enables/disables the screenshot at the end of the script (and therefore its comparison). It expects a boolean value or a CSS selector. Example:

```
screenshot: false // disable screenshot comparison at the end of the script
screenshot: "#test" // will take a screenshot of the specified element and compare it at the end
screenshot: true // back to "normal", full page screenshot and comparison
```

#### scroll-to

**scroll-to** command scrolls to the given position or element. It expects a tuple of integers (`(x, y)`) or a CSS selector. Examples:

```
scroll-to: "#element"
scroll-to: ".element"
scroll-to: (10, 12)
```

#### show-text

**show-text** command allows to enable/disable the text hiding. Example:

```
show-text: true // text won't be invisible anymore
```

#### size

**size** command changes the window's size. It expects a tuple of integers (`(width, height)`). Example:

```
size: (700, 1000)
```

#### text

**text** command allows to update an element's text. Example:

```
text: ("#button", "hello")
```

#### wait-for

**wait-for** command waits for a given duration or for an element to be created. It expects a CSS selector or a duration in milliseconds.

**/!\\** Be careful when using it: if the given selector never appears, the test will timeout after 30 seconds.

Examples:

```
wait-for: ".element"
wait-for: "#element > a"
wait-for: 1000
```

#### write

**write** command sends keyboard inputs on given element. If no element is provided, it'll write into the currently focused element. It expects a string and/or a CSS selector. The string has to be surrounded by quotes (either `'` or `"`). Examples:

```
write: (".element", "text")
write: ("#element", "text")
write: "text"
```

### Comments?

You can add comments in the `.goml` scripts with `//`. Example:

```
goto: https://somewhere.com // let's start somewhere!
```

## Run tests

If you want to run this repository's scripts tests:

```bash
$ node src/index.js --test-folder tests/scripts/ --failure-folder failures --variable DOC_PATH tests/html_files
```

If you want to test "internals", run:

```bash
$ npm run all-test
```

If you want to run test suites separately:

```bash
$ npm run api-test
$ npm run parser-test
$ npm run exported-test
```
