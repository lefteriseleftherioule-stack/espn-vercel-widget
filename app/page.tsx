export default function Page() {
  return (
    <div className="container">
      <div className="title">ESPN Scoreboard Widget</div>
      <div className="subtitle">Use /widget?sport=football&league=nfl to embed.</div>
      <div className="card">
        <div className="row">
          <span className="muted">Example</span>
          <a href="/widget?sport=football&league=nfl">Open NFL widget</a>
        </div>
      </div>
    </div>
  )
}
