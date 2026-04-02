import { BrowserRouter, Routes, Route } from 'react-router-dom'
import SessionList from './pages/SessionList.tsx'
import SessionDetail from './pages/SessionDetail.tsx'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SessionList />} />
        <Route path="/sessions/:id" element={<SessionDetail />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
