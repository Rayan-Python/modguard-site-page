import { useEffect, useState } from 'react'

const REPO = 'Rayan-Python/modguard-site-page'

export default function useDownloadCount() {
  const [count, setCount] = useState(null)

  useEffect(() => {
    let cancelled = false

    fetch(`https://api.github.com/repos/${REPO}/releases?per_page=100`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((releases) => {
        if (cancelled) return
        const total = releases.reduce((sum, release) => {
          const releaseTotal = (release.assets ?? [])
            .filter((a) => a.name.endsWith('.dmg'))
            .reduce((s, a) => s + a.download_count, 0)
          return sum + releaseTotal
        }, 0)
        setCount(total)
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [])

  return count
}
