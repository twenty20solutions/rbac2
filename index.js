const debug = require('debug')('rbac');

class RBAC {
  constructor(rules, checkFullPath, cacheTrees) {
    this.rules = rules;
    this.checkFullPath = Boolean(checkFullPath);
    this.cacheTrees = Boolean(cacheTrees);
    if (this.cacheTrees) {
      this.trees = {};
      this.paths = {};
    }
  }
  async check(role, permission, params, cb) {
    debug('check', role, permission, params);

    // If params not given, consider last argument as callback
    // eslint-disable-next-line no-magic-numbers
    if (arguments.length < 4 && typeof params === 'function') {
      cb = params;
      params = {};
    }
    if (!cb) {
      cb = (err, res) => new Promise((resolve, reject) => err ? reject(err) : resolve(res));
    }

    const paths = this.getPaths(role, permission);
    try {
      for (let i = 0; i < paths.length; i++) {
        const res = await checkPath(paths[i], params, this.checkFullPath);
        if (res) {
          return cb(null, true);
        }
      }
      return cb(null, false);
    } catch (err) {
      return cb(err, false);
    }
  }
  getTree(role) {
    debug('getTree', role);
    let result = this.trees && this.trees[role];
    if (!result) {
      debug('getTree', 'build', role);
      result = {
        value: role,
        children: toTree(role, this.rules)
      };
      debug('getTree', 'build', role, result);
      if (this.cacheTrees) {
        this.trees[role] = result;
      }
    }
    return result;
  }
  getPaths(role, permission) {
    debug('getPaths', role, permission);
    // let paths = _.get(this.paths, [role, permission]);
    let paths = this.paths && this.paths[role] && this.paths[role][permission];
    if (!paths) {
      const tree = this.getTree(role);
      paths = findPaths(tree, permission);
      // Sort by shortest first (i.e. no. of nodes)
      paths.sort((a, b) => a.length - b.length);
      if (this.cacheTrees) {
        this.paths[role] = this.paths[role] || {};
        this.paths[role][permission] = paths;
      }
    }
    return paths;
  }
}

function toTree(role, rules) {
  return rules.reduce((arr, { a, can, when }) => {
    if (a === role) {
      arr.push({
        value: can,
        when,
        children: toTree(can, rules)
      });
    }
    return arr;
  }, []);
}

function findPaths(root, permission) {
  const paths = [];
  if (root.value === permission) {
    paths.push([root]);
  } else {
    root.children.forEach((child) => {
      const childpaths = findPaths(child, permission);
      childpaths.forEach(cpath => paths.push([root, ...cpath]));
    });
  }
  return paths;
}

async function checkPath(path, params = {}, checkFullPath) {
  for (let i = 1; i < path.length; i++) {
    const node = path[i];
    if (node.when) {
      const result = await new Promise((resolve, reject) => {
        const prom = node.when(params, (err, res) => err ? reject(err) : resolve(res));
        if (prom && prom.then) {
          prom.then(resolve, reject);
        }
      });
      if (!result) {
        return false;
      }
    } else if (!checkFullPath) {
      return true;
    }
  }
  return true;
}

module.exports = RBAC;
