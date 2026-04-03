import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import MasterScreen from './pages/MasterScreen'
import PlayerDevice from './pages/PlayerDevice'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/master/:roomCode" element={<MasterScreen />} />
        <Route path="/play/:roomCode" element={<PlayerDevice />} />
      </Routes>
    </BrowserRouter>
  )
}
