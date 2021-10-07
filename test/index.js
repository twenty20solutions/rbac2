const RBAC = require('../');

const rules = [
  {
    a: 'visitor',
    can: 'read articles'
  },
  {
    a: 'user',
    can: 'vote on articles'
  },
  {
    a: 'article editor',
    can: 'edit article'
  },
  {
    a: 'user',
    can: 'article editor',
    when(params, cb) {
      return cb(null, params.userId === 2);
    }
  },
  {
    a: 'user',
    can: 'delete article',
    when: async params => params.userId === 3
  },
  {
    a: 'user',
    can: 'do nothing with callbacks',
    when: (params, cb) => {
      cb(new Error());
    }
  },
  {
    a: 'user',
    can: 'do nothing with promises',
    when: () => Promise.reject(new Error())
  },
  {
    a: 'admin',
    can: 'user'
  },
  {
    a: 'admin',
    can: 'article editor'
  },
  {
    a: 'superadmin',
    can: 'delete user'
  },
  {
    a: 'superadmin',
    can: 'admin'
  },
  {
    a: 'user',
    can: 'visitor'
  },
  {
    a: 'user',
    can: 'read articles'
  }
];


function rbacTest(rbac) {

  const expectCheck = (done, value) => (err, res) => {
    if (err) return done(err);
    should.equal(res, value);
    return done();
  };

  it('should return true when a path is found', (done) => {
    rbac.check('admin', 'read articles', expectCheck(done, true));
  });
  it('should return false when a path is not found', (done) => {
    rbac.check('user', 'delete user', expectCheck(done, false));
  });
  it('should return false when a conditional is not satisfied', (done) => {
    rbac.check('user', 'edit article', expectCheck(done, false));
  });
  it('should return false when a conditional is not satisfied w/params', (done) => {
    rbac.check('user', 'edit article', { userId: 1 }, expectCheck(done, false));
  });
  it('should work when a callback conditional is satisfied', (done) => {
    rbac.check('user', 'edit article', { userId: 2 }, expectCheck(done, true));
  });
  it('should work an async conditional is satisfied', (done) => {
    rbac.check('user', 'delete article', { userId: 3 }, expectCheck(done, true));
  });
  it('should allow a higher node to ignore conditionals based on "checkFullPath"', (done) => {
    rbac.check('superadmin', 'delete article', expectCheck(done, !rbac.checkFullPath));
  });

  it('should propagate conditional errors from callbacks', (done) => {
    rbac.check('user', 'do nothing with callbacks', (err) => {
      should.exist(err);
      done();
    });
  });
  it('should propagate conditional errors from promises', (done) => {
    rbac.check('user', 'do nothing with promises', (err) => {
      should.exist(err);
      done();
    });
  });
}

function rbacTestPromise(rbac) {
  it('should return true when a path is found',
    async () => rbac.check('admin', 'read articles').should.eventually.equal(true));
  it('should return false when a path is not found',
    async () => rbac.check('user', 'delete user').should.eventually.equal(false));
  it('should return false when a conditional is not satisfied',
    async () => rbac.check('user', 'edit article').should.eventually.equal(false));
  it('should return false when a conditional is not satisfied',
    async () => rbac.check('user', 'edit article', { userId: 1 }).should.eventually.equal(false));
  it('should work when a callback conditional is satisfied',
    async () => rbac.check('user', 'edit article', { userId: 2 }).should.eventually.equal(true));
  it('should work an async conditional is satisfied',
    async () => rbac.check('user', 'delete article', { userId: 3 }).should.eventually.equal(true));
  it('should allow a higher node to ignore conditionals based on "checkFullPath"',
    async () => rbac.check('superadmin', 'delete article').should.eventually.equal(!rbac.checkFullPath));

  it('should propagate conditional errors from callbacks',
    async () => rbac.check('user', 'do nothing with callbacks').should.eventually.be.rejected);
  it('should propagate conditional errors from promises',
    async () => rbac.check('user', 'do nothing with promises').should.eventually.be.rejected);
}


describe('RBAC w/o caching (callbacks)', () => rbacTest(new RBAC(rules)));
describe('RBAC when checking full trees', () => rbacTest(new RBAC(rules, true, true)));
describe('RBAC w/caching (callbacks)', () => rbacTest(new RBAC(rules, false, true)));

describe('RBAC w/o caching (promises/async/await)', () => rbacTestPromise(new RBAC(rules)));
describe('RBAC when checking full trees (promises/async/await)', () => rbacTestPromise(new RBAC(rules, true, true)));
describe('RBAC w/caching (promises/async/await)', () => rbacTestPromise(new RBAC(rules, false, true)));
