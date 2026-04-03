import { BrowserRouter, Routes, Route } from 'react-router-dom'
import SessionList from './pages/SessionList.tsx'
import SessionDetail from './pages/SessionDetail.tsx'
import SessionCompare from './pages/SessionCompare.tsx'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SessionList />} />
        <Route path="/sessions/:id" element={<SessionDetail />} />
        <Route path="/compare" element={<SessionCompare />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
