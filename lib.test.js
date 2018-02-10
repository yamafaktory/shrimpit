const Shrimpit = require('./lib')

it('should create a snapshot of the files tree and of the unused exports', () => {
  const shrimpit = new Shrimpit(['', '', 'test', '--json'])
  expect(shrimpit.exec()).toMatchSnapshot();
})
