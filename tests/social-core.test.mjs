import test from 'node:test';
import assert from 'node:assert/strict';
import {jointProgress} from '../social-core.js';

test('joint day uses Japan day and preserves yesterday until today closes',()=>{
  const activity={a:new Set(['2026-10-12','2026-10-13']),b:new Set(['2026-10-12','2026-10-13'])};
  assert.equal(jointProgress(['a','b'],activity,'2026-10-12','2026-10-14').days,2);
  activity.a.add('2026-10-14');
  assert.deepEqual(jointProgress(['a','b'],activity,'2026-10-12','2026-10-14').today,[{uid:'a',done:true},{uid:'b',done:false}]);
  assert.equal(jointProgress(['a','b'],activity,'2026-10-13','2026-10-14').days,1);
  activity.b.add('2026-10-14');
  assert.equal(jointProgress(['a','b'],activity,'2026-10-13','2026-10-14').days,2);
  assert.equal(jointProgress(['a'],activity,'2026-10-13','2026-10-14').days,null);
});
