const Shrimpit = require('./lib')

const inputPaths = (...arr) => ['', '', ...arr, '--json']
const outputSnapshot = async shrimpit => JSON.parse(await shrimpit.exec())

describe('core functionality', () => {
  it('should create a snapshot of the files tree and of the unused exports - main', async () => {
    const shrimpit = new Shrimpit(inputPaths('test/core'))
    expect(await outputSnapshot(shrimpit)).toMatchSnapshot()
  })

  it('should create a snapshot of the files tree and of the unused exports - re-exports', async () => {
    const shrimpit = new Shrimpit(inputPaths('test/re-exports'))
    expect(await outputSnapshot(shrimpit)).toMatchSnapshot()
  })
})

describe('globs handling', () => {
  it('should handle globs correctly', async () => {
    const shrimpit = new Shrimpit(inputPaths('test/core/**/*.js', '!**/(c|d)/*'))
    expect(await outputSnapshot(shrimpit)).toMatchSnapshot()
  })
})
