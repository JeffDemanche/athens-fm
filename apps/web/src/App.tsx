import { Navigate, Route, Routes } from "react-router-dom";
import { HostRoomView } from "@/views/host-room/host-room-view";
import { LandingView } from "@/views/landing/landing-view";
import { ParticipantRoomView } from "@/views/participant-room/participant-room-view";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingView />} />
      <Route path="/rooms/:roomId/host" element={<HostRoomView />} />
      <Route path="/rooms/:roomId" element={<ParticipantRoomView />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
