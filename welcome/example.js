class Test {
  func(argument) {
    if (argument === 5.3) {
      return true;
    }
    return NaN;
  }
}

function tester() {
  const test1 = new Test();
  const test2 = new Test();
  let mutTest = test1.func() ? test1 : test2;
  console.log(mutTest.func(mutTest) ? "Hello, " : "world!");
}
