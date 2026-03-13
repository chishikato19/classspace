# PROJECT DIARY - SMART CARD SCANNING FEATURE (PLICKERS STYLE)

## 1. Feature Overview
A real-time assessment tool using physical QR-coded cards. The teacher uses a smartphone to scan the class, and the system automatically records answers and displays progress on a projector.

## 2. Technical Architecture
- **Dual-Device Sync**: 
    - **Controller (Phone)**: Captures video, processes QR codes, and pushes data to the database.
    - **Display (Projector/Laptop)**: Listens for real-time updates and renders the UI for students.
- **Communication**: Real-time sync via Firestore/WebSockets.
- **Computer Vision Engine**:
    - Primary: `BarcodeDetector API` (Native Browser API).
    - Fallback: `zxing-wasm` running in a Web Worker.
    - Target: 30 FPS processing.

## 3. Core Logic & Mathematics
- **QR Mapping**: Each QR ID maps to a specific `Student_ID` or `Card_Number`.
- **Orientation Detection**:
    - Calculate the vector between Top-Left and Top-Right corner points.
    - Use `Math.atan2(dy, dx)` to determine the rotation angle (0-360°).
- **Answer Mapping**:
    - 0° (±45°): **A**
    - 90° (±45°): **B**
    - 180° (±45°): **C**
    - 270° (±45°): **D**

## 4. UI/UX Specifications
### Projector Display (Side-Panel Layout)
- **Ratio**: 3/5 (Left - Question Content) | 2/5 (Right - Tracking Board).
- **Tracking Board**:
    - Grid of student cards: `[Card #] Name`.
    - Name processing: Display only the last part of the full name (e.g., "An").
    - States:
        - *Pending*: Dark/Dimmed background.
        - *Received*: Bright Green/Yellow with a "Pop" animation.
    - Security: No answers (A/B/C/D) shown on the projector.

### Mobile Controller (AR Scanner)
- **AR Overlay**: Bounding boxes drawn over detected cards with real-time Name/Answer labels.
- **Remote Control**: Buttons to "Start Question", "End Question", and "Show Results" directly from the phone.
- **Debouncing**: Cache results to prevent redundant database writes unless the answer changes.

## 5. Future Enhancements
- Export session reports to PDF/Excel.
- Cumulative points/Leaderboard across multiple sessions.
- Hybrid mode: Support both physical cards and digital device responses simultaneously.

## 6. Feature: Student Work Showcase (Live Visualizer)
A separate tool to project student physical work (notebooks, drawings) onto a large screen using the teacher's smartphone.

### Mode A: Live Video (Visualizer)
- **Document Camera Mode**: Stream live video from phone to projector.
- **Freeze Frame**: Lock the current image on the projector so the teacher can explain without holding the phone.
- **Digital Laser Pointer**: Touch the phone screen to display a pointer on the projector.
- **Live Annotation**: Draw or highlight on the phone screen; markings appear in real-time on the projector.

### Mode B: Snapshot & Gallery (Showcase)
- **Multi-Snapshot**: Capture multiple photos of different students' work while walking around the class.
- **Push to Projector**: Select specific photos from a temporary gallery to display on the big screen.
- **Side-by-Side Comparison**: Display two snapshots simultaneously (e.g., comparing a correct solution with a common mistake).
- **Privacy Guard**: Only the image content is transmitted; phone UI, notifications, and personal galleries are hidden.

### Technical Requirements
- **High-Speed Streaming**: Use WebRTC or optimized WebSocket frame transmission for low-latency video.
- **Image Persistence**: Option to save snapshots directly to the student's digital portfolio or class archive.
