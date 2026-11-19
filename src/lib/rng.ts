export function mulberry32(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function shuffle<T>(items: T[], seed: number): T[] {
  const next = [...items]
  const rand = mulberry32(seed)
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(rand() * (index + 1))
    const current = next[index]
    next[index] = next[swap]
    next[swap] = current
  }
  return next
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 1_000_000_000)
}
