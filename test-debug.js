const { XdbEngine } = require('./src/lib/XdbEngine');

const engine = new XdbEngine();
engine.createDatabase('testdb');
engine.createTable('testdb', 'CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, age INTEGER)');

// Insert
const insertResult = engine.executeQuery('testdb', "INSERT INTO users (id, name, age) VALUES (1, 'Alice', 30)");
console.log('Insert result:', insertResult);

// Get table data after insert
const table = engine.getTableData('testdb', 'users');
console.log('Table data after insert:', table);

// Try UPDATE
const updateResult = engine.executeQuery('testdb', "UPDATE users SET age = 31 WHERE id = 1");
console.log('Update result:', updateResult);

// Get table data after update
const tableAfter = engine.getTableData('testdb', 'users');
console.log('Table data after update:', tableAfter);
