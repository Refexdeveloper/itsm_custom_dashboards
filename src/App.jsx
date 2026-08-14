import ITHeadRefexDashboardProject from './ITHeadRefexDashboardProject.jsx'
import E2eDashboardHost from './E2eDashboardHost.jsx'

function isE2eMode() {
  try {
    return new URLSearchParams(window.location.search).get('e2e') === '1'
  } catch {
    return false
  }
}

function App() {
  if (isE2eMode()) {
    return (
      <div className="rootDiv">
        <E2eDashboardHost />
      </div>
    )
  }

  return (
    <div className="rootDiv">
      <ITHeadRefexDashboardProject />
    </div>
  )
}

export default App
