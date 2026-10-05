// Run with the server running: node dist/test-users.cjs
const assert = require('node:assert/strict');
const vm = require('node:vm');

(async () => {
  const response = await fetch('http://localhost:3001');
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<title>Users<\/title>/);
  const element = () => ({ children: [], textContent: '', handlers: {},
    append(child) { this.children.push(child); },
    replaceChildren() { this.children = []; },
    addEventListener(event, handler) { this.handlers[event] = handler; },
    setAttribute() {}, focus() {},
    reset() { this.resetCalled = true; }
  });
  const nodes = Object.fromEntries(['user-form', 'save', 'refresh', 'status', 'list-status', 'users', 'cancel', 'add-title'].map(id => ['#' + id, element()]));
  const username = 'page-check-' + Date.now();
  const fields = { username, email: 'page-check@example.invalid', password: require('node:crypto').randomUUID(), age: '20' };
  const originalPassword = fields.password;
  nodes['#user-form'].elements = Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, { value, focus() {} }]));
  let confirmed = false;
  let id;
  let fail = false;
  const context = {
    document: { querySelector: selector => nodes[selector], createElement: element },
    confirm: () => confirmed,
    FormData: class { constructor() { return Object.entries(nodes['#user-form'].elements).map(([key, field]) => [key, field.value]); } },
    fetch: async (url, options) => {
      if (fail) throw new Error('Connection unavailable');
      const result = await fetch('http://localhost:3001' + url, options);
      if (options?.method === 'POST' && result.ok) id = (await result.clone().json())._id;
      return result;
    }
  };
  vm.createContext(context);
  try {
    vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1].replace(/    loadUsers\(\);\s*$/, ''), context);
    await nodes['#user-form'].handlers.submit({ preventDefault() {} });
    assert.ok(id);
    assert.equal(nodes['#status'].textContent, 'User saved successfully.');
    assert.ok(nodes['#user-form'].resetCalled);
    assert.ok(nodes['#users'].children.some(row => row.children[0].textContent === username));
    const findRow = () => nodes['#users'].children.find(row => row.children[0].textContent === username);
    await findRow().children[3].children[0].children[0].handlers.click();
    assert.equal(nodes['#save'].textContent, 'Save changes');
    nodes['#user-form'].elements.age.value = '21';
    await nodes['#user-form'].handlers.submit({ preventDefault() {} });
    const stored = await (await fetch('http://localhost:3001/api/users/' + id)).json();
    assert.equal(stored.age, 21);
    assert.equal(stored.password, originalPassword);
    await findRow().children[3].children[0].children[0].handlers.click();
    await nodes['#cancel'].handlers.click();
    assert.equal(nodes['#save'].textContent, 'Add user');
    await findRow().children[3].children[0].children[1].handlers.click();
    assert.equal((await fetch('http://localhost:3001/api/users/' + id)).status, 200);
    confirmed = true;
    await findRow().children[3].children[0].children[1].handlers.click();
    assert.equal((await fetch('http://localhost:3001/api/users/' + id)).status, 404);
    assert.equal(findRow(), undefined);
    id = null;
    fail = true;
    await nodes['#refresh'].handlers.click();
    assert.match(nodes['#list-status'].textContent, /Connection unavailable/);
    assert.equal(nodes['#refresh'].disabled, false);
    console.log('PASS: create, edit, password preserved, cancel, delete confirmation, delete, refresh errors');
  } finally {
    if (id) assert.equal((await fetch('http://localhost:3001/api/users/' + id, { method: 'DELETE' })).status, 200);
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
