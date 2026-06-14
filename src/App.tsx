import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout/Layout";
import { AudioAnalysisPage } from "@/pages/AudioAnalysis/AudioAnalysisPage";
import { ChoreographyPage } from "@/pages/Choreography/ChoreographyPage";
import { CalibrationPage } from "@/pages/Calibration/CalibrationPage";
import { PlaybackPage } from "@/pages/Playback/PlaybackPage";
import { LibraryPage } from "@/pages/Library/LibraryPage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<AudioAnalysisPage />} />
          <Route path="/choreography" element={<ChoreographyPage />} />
          <Route path="/calibration" element={<CalibrationPage />} />
          <Route path="/playback" element={<PlaybackPage />} />
          <Route path="/library" element={<LibraryPage />} />
        </Route>
      </Routes>
    </Router>
  );
}
