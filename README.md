# rbac2
[![npm version](https://badge.fury.io/js/@twenty20solutions%2Frbac2.svg)](https://badge.fury.io/js/@twenty20solutions%2Frbac2) [![Build Status](https://github.com/twenty20solutions/rbac2/actions/workflows/build.yml/badge.svg?branch=master)](https://github.com/twenty20solutions/rbac2/actions/workflows/build.yml)

Simple RBAC checker with support for context checks.

## Installation

```bash
npm install @twenty20solutions/rbac2
```

## Usage

### Simple roles
```js
const RBAC = require('@twenty20solutions/rbac2');

const rules = [
    {a: 'author', can: 'publish posts'},
    {a: 'editor', can: 'edit posts'},
    {a: 'editor', can: 'author'},
    {a: 'admin',  can: 'editor'},
    {a: 'admin',  can: 'do admin'}
];

const rbac = new RBAC(rules);

// Perform a check
rbac.check('admin', 'edit posts', function (err, result) {
    // result: true
});
```

### rbac.check
#### Use callbacks, promises or async/await

```js
// Using callbacks
rbac.check('admin', 'edit posts', function (err, result) {
    // result: true
});

// Using promises
rbac.check('admin', 'edit posts')
  .then(result => {
    // result: true
  });

// Using async/await
const result = await rbac.check('admin', 'edit posts');
// result: true
```

If a callback function is not passed, a promise is returned. This will throw an error in later versions of node if a
promise rejection isn't explicitly handled! All errors from context checks are passed upwards to the calling check
function.

### Adding context checks
You can specify context checks in rules by adding a `when` function:
```js
const rules = [
    {a: 'author', can: 'publish posts'},
    {a: 'editor', can: 'edit posts'},
    {a: 'user',   can: 'editor', when: function (params, callback) {
        db.findOne('tbl_post_editors', {
            'post_id': params.postId,
            'user_id': params.userId
        }, callback);
    }},
    {a: 'editor', can: 'author'},
    {a: 'admin',  can: 'editor'},
    {a: 'admin',  can: 'do admin'}
];
```
And check by passing context parameters:
```js
// Callbacks
rbac.check('user', 'edit posts', { postId: 23, userId:12 }, function (err, result) {
    // ...
});

// Promises
rbac.check('user', 'edit posts', { postId: 23, userId:12 })
  .then((result) => {
    // ...
  });


// async/await
const result = await rbac.check('user', 'edit posts', { postId: 23, userId:12 })
```

In the code above, we set the rule that any user can become the editor
for a post only if that user has the 'editor' role for the post in the database.
Here, `when` is a user-provided check that will be given `params` from the `check` call.

After doing business logic checks, the `when` function should call the callback
as `callback(err, result)`, where `result` should be boolean. (If `err` is not
`null`, then `result` is considered `false`)

### About rules
#### No subject, role or permission - only hierarchy
This is valid:
```js
const rules = [
    {a: 'editor',     can: 'edit posts'},
    {a: 'edit posts', can: 'change post url'}
];
```

#### Cyclic hierarchy is NOT supported
This is invalid:
```js
const rules = [
    {a: 'admin', can: 'user'},
    {a: 'user',  can: 'admin', when: function (err, callback) {...}}
];
```

and will result in an indefinite loop.

#### Conditional and non-conditional paths
Given these rules:
```js
const rules = [
    {a: 'editor', can: 'edit posts'},
    {a: 'user',   can: 'editor', when: function (params, callback) {
        // business logic check
    }},
    {a: 'admin',  can: 'user'}
];
```

If we check from a 'user' role:
```js
rbac.check('user', 'edit posts', {...}, function (err, res) {
    // ...
});
```

The following path is checked:
```txt
'user' --> 'editor' [conditional] --> 'edit posts'
```

To go from 'user' to 'editor', the context condition must be satisfied.

But, if we check from a 'admin' role:
```js
rbac.check('admin', 'edit posts', function (err, res) {
    // ...
});
```

The following path is checked:
```txt
'admin' --> 'user' --> 'editor' [conditional] --> 'edit posts'
```

To go from 'admin' to 'user', there is no condition. So the rest of the path is
considered to be checked AND successful.

If the whole path is needed to be checked, then you can instantiate RBAC with an optional second parameter, checkFullPath, or set it after creating the object. It defaults to false, unless set.

```js
const RBAC = require('@twenty20solutions/rbac2', true);
```
or
```js
const RBAC = require('@twenty20solutions/rbac2');
RBAC.checkFullPath = true;
```

> **In general**: Paths are traversed continuously till conditional checks exist;
> if a node in the path is hopped without a conditional check, the remaining path
> is considered to be solved and the result is true.
> If checkFullPath, then the whole path needs to be satisfied until the end.

#### Multiple paths to same permission
For the following rules:
```js
const rules = [
    {a: 'editor', can: 'edit posts'},
    {a: 'user',   can: 'editor', when: function (params, callback) {
        // business logic check
    }},
    {a: 'user',   can: 'edit posts'}
];
```
If you do the following check:
```js
rbac.check('user', 'edit posts', function (err, res) {
    // ...
});
```
Then we have these possible paths:
```txt
1] 'user' --> 'edit posts'
2] 'user' --> 'editor' [conditional] --> 'edit posts'
```
Paths are checked in serial order. The shortest path is picked up first (though it might not take the least time if conditional). When the match is
found, any remaining paths are not checked and the result is returned
immediately.

### Caching of rule trees
If you have a large/complex set of rules with roles inheriting from other roles, generating the tree for the role can take a significant amount of time (tens of milliseconds). To speed up the checks, you can ask rbac to cache the tree for each role once it has been generated, at the expense of slightly more use of memory to hold the cached trees.

To use in-memory caching of the trees, instantiate RBAC with an optional third parameter (cacheTree). Default is false.

```js
const RBAC = require('@twenty20solutions/rbac2')(rules, false, true);
```

## Testing
```bash
npm i && npm test
```

## License
[MIT](LICENSE)
