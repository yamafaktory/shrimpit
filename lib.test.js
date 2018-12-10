const Shrimpit = require('./lib')

const inputPaths = (...arr) => ['', '', ...arr, '--json']
const outputSnapshot = async shrimpit => JSON.parse(await shrimpit.exec())

it('should create a snapshot of the files tree and of the unused exports', async () => {
  const shrimpit = new Shrimpit(inputPaths('test'))
  expect(await outputSnapshot(shrimpit)).toMatchSnapshot()
})

describe('globs', () => {
  it('should handle globs correctly', async () => {
    const shrimpit = new Shrimpit(inputPaths('test/**/*.js', '!**/(c|d)/*'))
    expect(await outputSnapshot(shrimpit)).toMatchSnapshot()
  })
})
