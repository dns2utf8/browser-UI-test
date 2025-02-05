# browser-UI-test

Small JS framework to easily provide UI screenshot-based tests.

## Description

This framework provides the possibility to quickly check browser UI through small script files (with the `.goml` extension). By default, once the script is done running, it takes a screenshot of the page and compares it to the expected one. If they're different, the test will fail.

## Quick links

This is a big README, so to make you go through it faster:

 * [Usage](#usage)
 * [Using this framework as a binary](#using-this-framework-as-a-binary)
 * [Using this framework as a dependency](#using-this-framework-as-a-dependency)
 * [Exported elements](#exported-elements)
 * [Running it directly](#running-it-directly)
 * [Command list](#goml-scripts)
 * [Code comments](#comments)
 * [Run tests](#run-tests)
 * [Donations](#donations)

## Usage

You can either use this framework by using it as dependency or running it directly. In both cases you'll need to write some `.goml` scripts. It looks like this:

```
goto: https://somewhere.com // go to this url
text: ("#button", "hello") // set text of element #button
assert: ("#button", "hello") // check if #button element's text has been set to "hello"
```

The list of the commands is available [below](#goml-scripts).

### Trouble installing puppeteer?

In case you can't install puppeteer "normally", you can give a try to `--unsafe-perm=true`:

```bash
$ npm install puppeteer --unsafe-perm=true
```

### Using this framework as a binary

If you installed it, you should have a script called "browser-ui-test". You can run it as follows:

```bash
$ browser-ui-test --test-files some-file.goml
```

To see the list of available options, use `-h` or `--help`:

```bash
$ browser-ui-test --help
```

### Using Docker

This repository provides a `Dockerfile` in case you want to make your like easier when running
tests. For example, the equivalent of running `npm run test` is:

```bash
# in case I am in the browser-UI-test folder
$ docker build . -t browser-ui
$ docker run \
    -v "$PWD:/data" \
    -u $(id -u ${USER}):$(id -g ${USER}) \
    browser-ui \
    # browser-ui-test options from this point
    --test-folder /data/tests/scripts/ \
    --failure-folder /data/failures \
    --variable DOC_PATH /data/tests/html_files
```

Explanations for these commands! The first one builds an image using the current folder and names it
"browser-ui".

The second one runs using what we built in the first command. Two important things here are
`-v "$PWD:/data"` and `-u $(id -u ${USER}):$(id -g ${USER})`.

`-v "$PWD:/data"` is used to tell docker to bind the current folder (`$PWD`) in the `/data` folder
in the context of docker. If you want to bind another folder, just change the `$PWD` value. Please
remember that you need to use absolute paths!

`-u $(id -u ${USER}):$(id -g ${USER})` is used to run the docker container as the current user so
that the generated files aren't owned by `root` (which can quickly become annoying).

Then we tell it to run the "browser-ui" image.

For the rest, `--test-folder`, `--failure-folder` and `--variable` are `browser-UI-test` options.
You'll note that I prepended them with "/data" because this is where we mounted the volume in the
docker instance. To know what the options are for, please refer to the [Options][#Options] part of
this README.

#### Docker hub

Important note: each merge on master pushes a new image on docker hub. You can find them [here](https://hub.docker.com/repository/docker/gomezguillaume/browser-ui-test/general).

There are three kinds of docker images:

 1. By (npm) version
 2. Latest master branch update
 3. By date

### Using this framework as a dependency

You can do so by importing both `runTests` and `Options` from `index.js`. `Options` is a class where
you can set the parameters you need/want. If you feel better providing "command-line args"-like
parameters, you can use it as follows:

```js
const {Options, runTests} = require('browser-ui-test');

const options = new Options();
try {
    // This is more convenient that setting fields one by one.
    options.parseArguments(['--no-screenshot', '--test-folder', 'some-other-place']);
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

Like said above, you can use this framework through code directly. Here is the list of available
elements:

 * `runTest`: Function to run a specific test. Parameters:
   * testPath: String [MANDATORY]
   * options: `Options` type [OPTIONAL]
   * saveLogs: Boolean [OPTIONAL]
 * `runTests`: Function to run tests based on the received options. Parameters:
   * options: `Options` type [OPTIONAL]
   * saveLogs: Boolean [OPTIONAL]
 * `Options`: Object used to store run options. More information follows in the [`Options`](#Options) section.

#### Options

If you want to see all the available options, just run with the `-h` or `--help` options. If you
want to build the `Options` object yourself, you might be interested by what follows.

The list of fields of the `Options` class is the following:

 * `debug`: display more information
 * `emulate`: name of the device you want to emulate (list of available devices is [here](https://github.com/GoogleChrome/puppeteer/blob/master/lib/DeviceDescriptors.js) or you can use `--show-devices` option)
 * `extensions`: extensions to be loaded by the browser
 * `failureFolder`: path of the folder where failed tests image will be placed (`testFolder` value by default)
 * `generateImages`: if provided, it'll generate test images and won't run comparison tests
 * `imageFolder`: path of the folder where screenshots are and where they are generated (`testFolder` value by default)
 * `noHeadless`: disable headless mode
 * `noScreenshot`: disable screenshots generation and comparison at the end of the scripts
 * `onPageCreatedCallback`: callback which is called when a new puppeteer page is created. It provides the puppeteer `page` and the test name as arguments.
 * `permissions`: List of permissions to enable (you can see the full list by running with `--show-permissions`)
 * `runId`: id to be used for failed images extension ('test' by default)
 * `showText`: disable text invisibility (be careful when using it!)
 * `testFiles`: list of `.goml` files' path to be run
 * `testFolder`: path of the folder where `.goml` script files are
 * `timeout`: number of milliseconds that'll be used as default timeout for all commands interacting with the browser. Defaults to 30 seconds, cannot be less than 0, if 0, it means it'll wait undefinitely so use it carefully!
 * `variables`: variables to be used in the `.goml` scripts (more information about variables [below](#Variables))

### Running it directly

You need to pass options through the command line but it's basically the same as doing it with code. Let's run it with the same options as presented above:

```bash
$ node src/index.js --test-folder some-other-place
```

## Font issues

Unfortunately, font rendering differs depending on the computer **and** on the OS. To bypass this
problem but still allow to have a global UI check, the text is invisible by default. If you are
**sure** that you need to check with the text visible, you can use the option `--show-text`.

## Variables

In this framework, you can use variables defined through the `--variable` option or through your
environment. For example, if you start your script with:

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
 * [`assert-false`](#assert-false)
 * [`assert-attribute`](#assert-attribute)
 * [`assert-attribute-false`](#assert-attribute-false)
 * [`assert-count`](#assert-count)
 * [`assert-count-false`](#assert-count-false)
 * [`assert-css`](#assert-css)
 * [`assert-css-false`](#assert-css-false)
 * [`assert-property`](#assert-property)
 * [`assert-property-false`](#assert-property-false)
 * [`assert-text`](#assert-text)
 * [`assert-text-false`](#assert-text-false)
 * [`attribute`](#attribute)
 * [`click`](#click)
 * [`compare-elements-attribute`](#compare-elements-attribute)
 * [`compare-elements-attribute-false`](#compare-elements-attribute-false)
 * [`compare-elements-css`](#compare-elements-css)
 * [`compare-elements-css-false`](#compare-elements-css-false)
 * [`compare-elements-position`](#compare-elements-position)
 * [`compare-elements-position-false`](#compare-elements-position-false)
 * [`compare-elements-property`](#compare-elements-property)
 * [`compare-elements-property-false`](#compare-elements-property-false)
 * [`compare-elements-text`](#compare-elements-text)
 * [`compare-elements-text-false`](#compare-elements-text-false)
 * [`css`](#css)
 * [`debug`](#debug)
 * [`drag-and-drop`](#drag-and-drop)
 * [`emulate`](#emulate)
 * [`fail`](#fail)
 * [`focus`](#focus)
 * [`geolocation`](#geolocation)
 * [`goto`](#goto)
 * [`javascript`](#javascript)
 * [`local-storage`](#local-storage)
 * [`move-cursor-to`](#move-cursor-to)
 * [`permissions`](#permissions)
 * [`press-key`](#press-key)
 * [`reload`](#reload)
 * [`screenshot`](#screenshot)
 * [`scroll-to`](#scroll-to)
 * [`show-text`](#show-text)
 * [`size`](#size)
 * [`text`](#text)
 * [`timeout`](#timeout)
 * [`wait-for`](#wait-for)
 * [`write`](#write)

#### assert

**assert** command checks that the element exists, otherwise fail. Examples:

```
// To be noted: all following examples can use XPath instead of CSS selector.

// will check that "#id > .class" exists
assert: "#id > .class"
assert: ("#id > .class") // strictly equivalent
```

#### assert-false

**assert-false** command checks that the element doesn't exist, otherwise fail. It's mostly doing the opposite of [`assert`](#assert). Examples:

```
// To be noted: all following examples can use XPath instead of CSS selector.

// will check that "#id > .class" doesn't exists
assert-false: "#id > .class"
assert-false: ("#id > .class") // strictly equivalent
```

#### assert-attribute

**assert-attribute** command checks that the given attribute(s) of the element(s) have the expected value. Examples:

```
assert-attribute: ("#id > .class", {"attribute-name": "attribute-value"})
assert-attribute: ("//*[@id='id']/*[@class='class']", {"key1": "value1", "key2": "value2"})

// If you to check all elements matching this selector/XPath, use `ALL`:
assert-attribute: ("#id > .class", {"attribute-name": "attribute-value"}, ALL)
assert-attribute: ("//*[@id='id']/*[@class='class']", {"key1": "value1", "key2": "value2"}, ALL)
```

Please note that if you want to compare DOM elements, you should take a look at the [`compare-elements`](#compare-elements-attribute) command.

#### assert-attribute-false

**assert-attribute-false** command checks that the given attribute(s) of the element(s) don't have the given value. Examples:

```
// IMPORTANT: "#id > .class" has to exist otherwise the command will fail!
assert-attribute-false: ("#id > .class", {"attribute-name": "attribute-value"})
assert-attribute-false: ("//*[@id='id']/*[@class='class']", {"key1": "value1", "key2": "value2"})

// If you to check all elements matching this selector/XPath, use `ALL`:
assert-attribute-false: ("#id > .class", {"attribute-name": "attribute-value"}, ALL)
assert-attribute-false: ("//*[@id='id']/*[@class='class']", {"key1": "value1", "key2": "value2"}, ALL)
```

Please note that if you want to compare DOM elements, you should take a look at the [`compare-elements-false`](#compare-elements-attribute-false) command.

Another thing to be noted: if you don't care wether the selector exists or not either, take a look at the [`fail`](#fail) command too.

#### assert-count

**assert-count** command checks that there are exactly the number of occurrences of the provided selector/XPath. Examples:

```
// will check that there are 2 "#id > .class"
assert-count: ("#id > .class", 2)
assert-count: ("//*[@id='id']/*[@class='class']", 2)
```

#### assert-count-false

**assert-count-false** command checks that there are not the number of occurrences of the provided selector/XPath. Examples:

```
// will check that there are not 2 "#id > .class"
assert-count-false: ("#id > .class", 2)
assert-count-false: ("//*[@id='id']/*[@class='class']", 2)
```

#### assert-css

**assert-css** command checks that the CSS properties of the element(s) have the expected value. Examples:

```
assert-css: ("#id > .class", { "color": "blue" })
assert-css: ("//*[@id='id']/*[@class='class']", { "color": "blue", "height": "10px" })

// If you to check all elements matching this selector/XPath, use `ALL`:
assert-css: ("#id > .class", { "color": "blue" }, ALL)
assert-css: ("//*[@id='id']/*[@class='class']", { "color": "blue", "height": "10px" }, ALL)
```

Please note that if you want to compare DOM elements, you should take a look at the [`compare-elements`](#compare-elements-css) command.

#### assert-css-false

**assert-css-false** command checks that the CSS properties of the element(s) don't have the provided value. Examples:

```
// IMPORTANT: "#id > .class" has to exist otherwise the command will fail!
assert-css-false: ("#id > .class", { "color": "blue" })
assert-css-false: ("//*[@id='id']/*[@class='class']", { "color": "blue", "height": "10px" })

// If you to check all elements matching this selector/XPath, use `ALL`:
assert-css-false: ("#id > .class", { "color": "blue" }, ALL)
assert-css-false: ("//*[@id='id']/*[@class='class']", { "color": "blue", "height": "10px" }, ALL)
```

Please note that if you want to compare DOM elements, you should take a look at the [`compare-elements-false`](#compare-elements-css-false) command.

Another thing to be noted: if you don't care wether the selector exists or not either, take a look at the [`fail`](#fail) command too.

#### assert-property

**assert-property** command checks that the DOM properties of the element(s) have the expected value. Examples:

```
assert-property: ("#id > .class", { "offsetParent": "null" })
assert-property: ("//*[@id='id']/*[@class='class']", { "offsetParent": "null", "clientTop": "10px" })

// If you to check all elements matching this selector/XPath, use `ALL`:
assert-property: ("#id > .class", { "offsetParent": "null" }, ALL)
assert-property: ("//*[@id='id']/*[@class='class']", { "offsetParent": "null", "clientTop": "10px" }, ALL)
```

Please note that if you want to compare DOM elements, you should take a look at the [`compare-elements`](#compare-elements-property) command.

#### assert-property-false

**assert-property-false** command checks that the CSS properties of the element(s) don't have the provided value. Examples:

```
// IMPORTANT: "#id > .class" has to exist otherwise the command will fail!
assert-property-false: ("#id > .class", { "offsetParent": "null" })
assert-property-false: ("//*[@id='id']/*[@class='class']", { "offsetParent": "null", "clientTop": "10px" })

// If you to check all elements matching this selector/XPath, use `ALL`:
assert-property-false: ("#id > .class", { "offsetParent": "null" }, ALL)
assert-property-false: ("//*[@id='id']/*[@class='class']", { "offsetParent": "null", "clientTop": "10px" }, ALL)
```

Please note that if you want to compare DOM elements, you should take a look at the [`compare-elements-false`](#compare-elements-property-false) command.

Another thing to be noted: if you don't care wether the selector exists or not either, take a look at the [`fail`](#fail) command too.

#### assert-text

**assert-text** command checks that the element(s) have the expected text. Examples:

```
assert-text: ("#id > .class", "hello")
assert-text: ("//*[@id='id']/*[@class='class']", "hello")

// If you to check all elements matching this selector/XPath, use `ALL`:
assert-text: ("#id > .class", "hello", ALL)
assert-text: ("//*[@id='id']/*[@class='class']", "hello", ALL)
```

Please note that if you want to compare DOM elements, you should take a look at the [`compare-elements`](#compare-elements-text) command.

#### assert-text-false

**assert-text-false** command checks that the element(s) don't have the provided text. Examples:

```
// IMPORTANT: "#id > .class" has to exist otherwise the command will fail!
assert-text-false: ("#id > .class", "hello")
assert-text-false: ("//*[@id='id']/*[@class='class']", "hello")

// If you to check all elements matching this selector/XPath, use `ALL`:
assert-text-false: ("#id > .class", "hello", ALL)
assert-text-false: ("//*[@id='id']/*[@class='class']", "hello", ALL)
```

Please note that if you want to compare DOM elements, you should take a look at the [`compare-elements-false`](#compare-elements-text-false) command.

Another thing to be noted: if you don't care wether the selector exists or not either, take a look at the [`fail`](#fail) command too.

#### attribute

**attribute** command allows to update an element's attribute. Example:

```
attribute: ("#button", "attribute-name", "attribute-value")
// Same but with a XPath:
attribute: ("//*[@id='button']", "attribute-name", "attribute-value")
```

To set multiple attributes at a time, you can use a JSON object:

```
attribute: ("#button", {"attribute name": "attribute value", "another": "x"})
// Same but with a XPath:
attribute: ("//*[@id='button']", {"attribute name": "attribute value", "another": "x"})
```

#### click

**click** command send a click event on an element or at the specified position. It expects a CSS selector or an XPath or a position. Examples:

```
click: ".element"
// Same but with an XPath:
click: "//*[@class='element']"

click: "#element > a"
// Same but with an XPath:
click: "//*[@id='element']/a"

click: (10, 12)
```

#### compare-elements-attribute

**compare-elements-attribute** command allows you to compare two DOM elements' attributes are equal. Examples:

```
compare-elements-attribute: ("element1", "element2", ["attribute1", "attributeX", ...])
compare-elements-attribute: ("//element1", "element2", ["attribute1", "attributeX", ...])
```

#### compare-elements-attribute-false

**compare-elements-attribute-false** command allows you to check that two DOM elements' attributes are different. Examples:

```
// IMPORTANT: "element1" and "element2" have to exist otherwise the command will fail!
compare-elements-attribute-false: ("element1", "element2", ["attribute1", "attributeX", ...])
compare-elements-attribute-false: ("//element1", "element2", ["attribute1", "attributeX", ...])
```

Another thing to be noted: if you don't care wether the selector exists or not either, take a look at the [`fail`](#fail) command too.

#### compare-elements-css

**compare-elements-css** command allows you to check that two DOM elements' CSS properties are equal. Examples:

```
compare-elements-css: ("element1", "//element2", ["CSS property1", "CSS property2", ...])
compare-elements-css: ("//element1", "element2", ["CSS property1", "CSS property2", ...])
```

#### compare-elements-css-false

**compare-elements-css-false** command allows you to check that two DOM elements' CSS properties are different. Examples:

```
// IMPORTANT: "element1" and "element2" have to exist otherwise the command will fail!
compare-elements-css-false: ("element1", "//element2", ["CSS property1", "CSS property2", ...])
compare-elements-css-false: ("//element1", "element2", ["CSS property1", "CSS property2", ...])
```

Another thing to be noted: if you don't care wether the selector exists or not either, take a look at the [`fail`](#fail) command too.

#### compare-elements-position

**compare-elements-position** command allows you to check that two DOM elements' CSS X/Y positions are equal. Examples:

```
// Compare the X position.
compare-elements-position: ("//element1", "element2", ("x"))
// Compare the Y position.
compare-elements-position: ("element1", "//element2", ("y"))
// Compare the X and Y positions.
compare-elements-position: ("//element1", "//element2", ("x", "y"))
// Compare the Y and X positions.
compare-elements-position: ("element1", "element2", ("y", "x"))
```

#### compare-elements-position-false

**compare-elements-position-false** command allows you to check that two DOM elements' CSS X/Y positions are different. Examples:

```
// IMPORTANT: "element1" and "element2" have to exist otherwise the command will fail!

// Compare the X position.
compare-elements-position-false: ("//element1", "element2", ("x"))
// Compare the Y position.
compare-elements-position-false: ("element1", "//element2", ("y"))
// Compare the X and Y positions.
compare-elements-position-false: ("//element1", "//element2", ("x", "y"))
// Compare the Y and X positions.
compare-elements-position-false: ("element1", "element2", ("y", "x"))
```

Another thing to be noted: if you don't care wether the selector exists or not either, take a look at the [`fail`](#fail) command too.

#### compare-elements-property

**compare-elements-property** command allows you to check that two DOM elements' CSS properties are equal. Examples:

```
compare-elements-property: ("element1", "//element2", ["CSS property1", "CSS property2", ...])
compare-elements-property: ("//element1", "element2", ["CSS property1", "CSS property2", ...])
```

#### compare-elements-property-false

**compare-elements-property-false** command allows you to check that two DOM elements' CSS properties are different. Examples:

```
// IMPORTANT: "element1" and "element2" have to exist otherwise the command will fail!
compare-elements-property-false: ("element1", "//element2", ["CSS property1", "CSS property2", ...])
compare-elements-property-false: ("//element1", "element2", ["CSS property1", "CSS property2", ...])
```

Another thing to be noted: if you don't care wether the selector exists or not either, take a look at the [`fail`](#fail) command too.

#### compare-elements-text

**compare-elements-text** command allows you to compare two DOM elements' text content. Examples:

```
compare-elements-text: ("element1", "element2")
compare-elements-text: ("//element1", "element2")
```

#### compare-elements-text-false

**compare-elements-text-false** command allows you to compare two DOM elements (and check they're not equal!). Examples:

```
// IMPORTANT: "element1" and "element2" have to exist otherwise the command will fail!

compare-elements-text-false: ("//element1", "element2")
compare-elements-text-false: ("element1", "//element2")
```

Another thing to be noted: if you don't care wether the selector exists or not either, take a look at the [`fail`](#fail) command too.

#### css

**css** command allows to update an element's style. Example:

```
css: ("#button", "background-color", "red")
// Same but with an XPath:
css: ("//*[@id='button']", "background-color", "red")
```

To set multiple styles at a time, you can use a JSON object:

```
css: ("#button", {"background-color": "red", "border": "1px solid"})
// Same but with an XPath:
css: ("//*[@id='button']", {"background-color": "red", "border": "1px solid"})
```

#### debug

**debug** command enables/disables the debug logging. Example:

```
debug: false // disabling debug in case it was enabled
debug: true // enabling it again
```

#### drag-and-drop

**drag-and-drop** command allows to move an element to another place (assuming it implements the necessary JS and is draggable). It expects a tuple of two elements. Each element can be a position or a CSS selector or an XPath. Example:

```
drag-and-drop: ("#button", "#destination") // move "#button" to where "#destination" is
drag-and-drop: ("//*[@id='button']", (10, 10)) // move "//*[@id='button']" to (10, 10)
drag-and-drop: ((10, 10), "#button") // move the element at (10, 10) to where "#button" is
drag-and-drop: ((10, 10), (20, 35)) // move the element at (10, 10) to (20, 35)
```

#### emulate

**emulate** command changes the display to look like the targetted device. **It can only be used before the first `goto` call!** Example:

```
emulate: "iPhone 8"
```

To see the list of available devices, either run this framework with `--show-devices` option or go [here](https://github.com/GoogleChrome/puppeteer/blob/master/lib/DeviceDescriptors.js).

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

**focus** command focuses (who would have guessed?) on a given element. It expects a CSS selector or an XPath. Examples:

```
focus: ".element"
// Same but with an XPath:
focus: "//*[@class='element']"

focus: "#element"
// Same but with an XPath:
focus: "//*[@id='element']"
```

#### geolocation

**geolocation** command allows you to set your position. Please note that you might need to enable the `geolocation` permission in order to make it work. It expects as argument `([longitude], [latitude])`. Examples:

```
permissions: ["geolocation"] // we enable the geolocation permission just in case...
geolocation: (2.3635482, 48.8569108) // position of Paris
geolocation: (144.9337482, -37.7879639) // position of Melbourne
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

#### javascript

**javascript** command enables/disables the javascript. If you want to render the page without javascript, don't forget to disable it before the call to `goto`! Examples:

```
javascript: false // we disable it before using goto to have a page rendered without javascript
goto: https://somewhere.com // rendering without javascript
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
// Same but with an XPath:
move-cursor-to: "//*[@id='element']"

move-cursor-to: ".element"
// Same but with an XPath:
move-cursor-to: "//*[@class='element']"

move-cursor-to: (10, 12)
```

#### permissions

**permissions** command allows you to enable some of the browser's permissions. **All non-given permissions  will be disabled!** You can see the list of the permissions with the `--show-permissions` option. Examples:

```
permissions: ["geolocation"] // "geolocation" permission is enabled
permissions: ["camera"] // "camera" permission is enabled and "geolocation" is disabled
```

#### press-key

**press-key** command sends a key event (both **keydown** and **keyup** events). It expects a tuple of `(keycode, delay)` or simply `keycode`. `keycode` is either a string or an integer. `delay` is the time to wait between **keydown** and **keyup** in milliseconds (if not specified, it is 0).

The key codes (both strings and integers) can be found [here](https://github.com/puppeteer/puppeteer/blob/v1.14.0/lib/USKeyboardLayout.js).

Examples:

```
press-key: 'Escape'
press-key: 27 // Same but with an integer
press-key: ('Escape', 1000) // The keyup event will be send after 1000 ms.
```

#### reload

**reload** command reloads the current page. Example:

```
reload:
reload: 12000 // reload the current page with a timeout of 12 seconds
reload: 0 // disable timeout, be careful when using it!
```

#### screenshot

**screenshot** command enables/disables the screenshot at the end of the script (and therefore its comparison). It expects a boolean value or a CSS selector or an XPath. Example:

```
// Disable screenshot comparison at the end of the script:
screenshot: false

// Will take a screenshot of the specified element and compare it at the end:
screenshot: "#test"

// Same as the previous example but with an XPath:
screenshot: "//*[@id='test']"

// Back to "normal", full page screenshot and comparison:
screenshot: true
```

#### scroll-to

**scroll-to** command scrolls to the given position or element. It expects a tuple of integers (`(x, y)`) or a CSS selector. Examples:

```
scroll-to: "#element"
// Same but with an XPath:
scroll-to: "//*[@id='element']"

scroll-to: ".element"
// Same but with an XPath:
scroll-to: "//*[@class='element']"

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
// Same but with an XPath:
text: ("//*[@id='button']", "hello")
```

### timeout

**timeout** command allows you to update the timeout of pages' operations. The value is in milliseconds. If you set it to `0`, it'll wait indefinitely (so use it cautiously!). The default value is 30 seconds. Example:

```
timeout: 20000 // set timeout to 20 seconds
timeout: 0 // no more timeout, to be used cautiously!
```

#### wait-for

**wait-for** command waits for a given duration or for an element to be created. It expects a CSS selector or an XPath or a duration in milliseconds.

**/!\\** Be careful when using it: if the given selector never appears, the test will timeout after 30 seconds by default (can be changed with the `timeout` command).

Examples:

```
wait-for: 1000

wait-for: ".element"
// Same with an XPath:
wait-for: "//*[@class='element']"

wait-for: "#element > a"
// Same with an XPath:
wait-for: "//*[@id='element']/a"
```

#### write

**write** command sends keyboard inputs on given element. If no element is provided, it'll write into the currently focused element. Examples:

```
// It'll write into the given element if it exists:
write: (".element", "text")
write: ("//*[@class='element']", "text")
write: ("#element", 13) // this is the keycode for "enter"
write: ("//*[@id='element']", 13) // this is the keycode for "enter"

// It'll write into the currently focused element.
write: "text"
write: 13 // this is the keycode for "enter"
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

Or more simply:

```bash
$ npm test
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

## Donations

If you appreciate my work and want to support me, you can do it here:

[![Become a patron](https://c5.patreon.com/external/logo/become_a_patron_button.png)](https://www.patreon.com/GuillaumeGomez)
