import { describe, expect, test } from 'vitest'

// set this up for testing, pausing
async function fetchThing(path = '/', type: 'text' | 'json' | 'headers') {
  return await fetch(`${process.env.ONE_SERVER_URL}${path}`).then((res) => {
    if (type === 'headers') {
      return res.headers
    }
    return res[type]()
  })
}

describe('Middleware', () => {
  test('root middleware doesnt intercept', async () => {
    const res = await fetchThing('/', 'text')
    expect(res).includes(`<html`)
    expect(res).includes(`Welcome to One`)
  })

  test('root middleware intercept and return new response', async () => {
    const res = await fetchThing('/middleware?test-middleware', 'json')
    expect(res).toMatchInlineSnapshot(`
      {
        "middleware": "works",
      }
    `)
  })

  test('parent middleware runs and changes response before sub middleware', async () => {
    const res = await fetchThing('/middleware?test-middleware&intercept', 'json')
    expect(res).toMatchInlineSnapshot(`
      {
        "middleware": "works",
      }
    `)
  })

  test('middleware runs even on not found routes', async () => {
    const res = await fetchThing('/testing/that/this-route-doesnt-exist.md?test-middleware', 'json')
    expect(res).toMatchInlineSnapshot(`
      {
        "middleware": "works",
      }
    `)
  })

  // test('sub middleware intercepts', async () => {
  //   const res = await fetchThing('/middleware?intercept', 'json')
  //   expect(JSON.stringify(devRes)).toBe(JSON.stringify(prodRes))
  //   expect(devRes).toMatchInlineSnapshot(`
  //     {
  //       "didIntercept": true,
  //     }
  //   `)
  // })

  test.skip('sub middleware runs and changes headers', async () => {
    const res = (await fetchThing('/middleware', 'headers')) as Headers
    // TODO intercept not working
    // expect(devRes.get('test-header')).toBe(prodRes.get('test-header'))
    expect(res.get('test-header')).toBe('test-value')
  })
})
