# 🩸 BloodBridge — Blood Bank & Emergency Donor Management System

> **A real-time emergency blood dispatch and management platform connecting critical blood requests with available donors and verified blood banks using high-performance C++ graph algorithms.**

---

## 🌟 Key Highlights & Resume Alignment

* 🌐 **Live Website (Frontend):** [https://bloodbridge-web.vercel.app](https://bloodbridge-web.vercel.app)
* ⚙️ **Live Backend API (Render Cloud):** [https://bloodbridge-7y8c.onrender.com](https://bloodbridge-7y8c.onrender.com)
* **Emergency Dispatch System:** Connects emergency blood requests with nearby compatible donors and hospital blood banks in real time.
* **C++ Graph Algorithm Engine:** Implements **Dijkstra's Shortest Path Algorithm** using a **Min-Heap (`priority_queue`)** to determine the optimal route and identify the nearest facility or donor in $O((V + E) \log V)$ time.
* **Geospatial Mapping & Navigation:** Interactive GIS map powered by Leaflet and OpenStreetMap showing patient location, regional blood banks, donors, and turn-by-turn routing.
* **Full-Stack DBMS Integration:** RESTful APIs built on Express.js and MongoDB Atlas, managing multi-facility inventories and donor availability states.

---

## 🏗️ System Architecture

```
                 +-------------------------------------------+
                 |       React 19 + Vite Frontend (UI)       |
                 | - Leaflet OpenStreetMap GIS               |
                 | - Emergency Dispatch Control Room         |
                 | - Donor Search & Registration Forms       |
                 +-------------------------------------------+
                                       │
                                       │ HTTP / REST APIs
                                       ▼
                 +-------------------------------------------+
                 |       Node.js / Express.js Backend        |
                 | - Compatibility Matrix Validation         |
                 | - IPC Subprocess Spawner (`child_process`)|
                 | - Database Queries & Graph Construction   |
                 +-------------------------------------------+
                        │                             │
        Mongoose Driver │                             │ stdin / stdout (IPC)
                        ▼                             ▼
+-------------------------------+             +-------------------------------+
|     MongoDB Atlas (DBMS)      |             |   C++ Graph Engine (Binary)   |
| - `donors` Collection         |             | - Dijkstra's SSSP Algorithm   |
| - `bloodbanks` Stock Registry |             | - Min-Heap Binary Priority Q  |
| - Geo-coordinates & Telemetry |             | - $O((V + E) \log V)$ Runtime |
+-------------------------------+             +-------------------------------+
```

---

## ⚡ Algorithmic Deep-Dive (C++ Graph Engine)

In an emergency medical scenario, identifying the fastest route to an eligible donor or hospital is critical. Rather than relying solely on simple Euclidean distance, **BloodBridge models the city as a weighted, connected graph $G = (V, E)$**:

* **Vertices ($V$):** Emergency patient location (Node $0$), road network intersections, verified blood banks, and registered active donors.
* **Edges ($E$):** Road segments with weights representing real road distances and circuity factors.
* **Algorithm:** Single-Source Shortest Path (SSSP) via **Dijkstra's Algorithm** with a Min-Heap:
  $$\text{Time Complexity: } O((V + E) \log V)$$
  $$\text{Space Complexity: } O(V + E)$$

The Node.js backend streams the graph structure through `stdin` to the compiled C++ binary, which calculates the exact shortest path and returns ranked candidate facilities and donors through `stdout`.

---

## 🩺 Medical Compatibility Matrix

BloodBridge enforces standard medical donor-recipient compatibility rules:

| Patient Blood Group | Compatible Donor / Blood Bank Types |
| :--- | :--- |
| **O-** | O- *(Universal Donor)* |
| **O+** | O+, O- |
| **A-** | A-, O- |
| **A+** | A+, A-, O+, O- |
| **B-** | B-, O- |
| **B+** | B+, B-, O+, O- |
| **AB-**| AB-, A-, B-, O- |
| **AB+**| All 8 Blood Groups *(Universal Recipient)* |

---

## 🛠️ Technologies & Tools

* **Programming Languages:** C++ (C++17), JavaScript (ES6+), SQL / NoSQL
* **Frontend:** React 19, Vite, Leaflet, React-Leaflet, CSS3
* **Backend:** Node.js, Express.js, Child Process IPC
* **Database (DBMS):** MongoDB Atlas, Mongoose ODM
* **Algorithms & DSA:** Graph Theory, Dijkstra's Algorithm, Min-Heap Priority Queue, Adjacency Lists
* **DevOps & Version Control:** Git, GitHub, cross-platform GCC/G++ build pipelines

---

## 🚀 Getting Started Locally

### Prerequisites
* [Node.js](https://nodejs.org/) (v18+)
* [GCC / G++ Compiler](https://gcc.gnu.org/) (MinGW on Windows, build-essential on Linux/macOS)
* [MongoDB](https://www.mongodb.com/) (Atlas URI or local instance)

### 1. Clone the Repository
```bash
git clone https://github.com/PalakKapila72/BloodBridge.git
cd BloodBridge
```

### 2. Compile the C++ Graph Engine
* **On Windows:**
  ```powershell
  g++ -O3 cpp/graph.cpp -o cpp/graph.exe
  ```
* **On Linux / macOS:**
  ```bash
  g++ -O3 cpp/graph.cpp -o cpp/graph
  ```

### 3. Setup the Backend Server
```bash
cd server
cp .env.example .env
# Edit .env with your MongoDB Atlas connection string
npm install
npm start
```
*The backend automatically seeds verified blood centers if the collection is empty.*

### 4. Setup the Frontend Client
Open a second terminal in the project root:
```bash
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🌐 Cloud Deployment Guide

### Frontend (Vercel)
1. Push this repository to GitHub.
2. Import project into [Vercel](https://vercel.com/).
3. Framework Preset: **Vite**, Root Directory: `./`.
4. Deploy!

### Backend (Render / Railway)
1. Create a **Web Service** on [Render](https://render.com/).
2. Root Directory: `server`.
3. Build Command:
   ```bash
   g++ -O3 ../cpp/graph.cpp -o ../cpp/graph && npm install
   ```
4. Start Command:
   ```bash
   node server.js
   ```
5. Environment Variables:
   * `MONGODB_URI`: *Your MongoDB connection string*
   * `PORT`: `5000`

---

## 👤 Author

* **Palak Kapila**
* GitHub: [@PalakKapila72](https://github.com/PalakKapila72)
* Email: [palakkapila72@gmail.com](mailto:palakkapila72@gmail.com)
