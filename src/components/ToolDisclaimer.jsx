/**
 * The same disclaimer under every tool. It repeats the line the footer and the
 * terms already use — "a detection tool, not a guarantee" — because a person who
 * has just been told a file is Safe is exactly the person who needs to read it.
 */
export default function ToolDisclaimer() {
  return (
    <p className="tool__disclaimer">
      ModGuard is a detection tool and is not always right. It does not guarantee a file is
      safe or malicious. Always verify sources independently before installing anything.
    </p>
  )
}
