import { TestClass } from './test-simple';

describe('TestClass', () => {
  it('should work', () => {
    const test = new TestClass();
    expect(test.test()).toBe('test');
  });
});