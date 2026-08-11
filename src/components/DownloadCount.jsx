import { useEffect, useState } from 'react'

const REPO = 'Rayan-Python/modguard-site-page'

export default function DownloadCount() {
  const [count, setCount] = useState(null)

  useEffect(() => {
    let cancelled = false

    fetch(`https://api.github.com/repos/${REPO}/releases/latest`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((release) => {
        if (cancelled) return
        const asset = release.assets?.find((a) => a.name.endsWith('.dmg'))
        if (asset) setCount(asset.download_count)
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [])

  if (count === null) return null

  return (
    <p className="hero__meta">{count.toLocaleString()} downloads</p>
  )
}
