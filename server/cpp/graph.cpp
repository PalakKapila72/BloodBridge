#include <iostream>
#include <vector>
#include <queue>
#include <climits>
#include <string>
#include <algorithm>

using namespace std;

const long long INF = 1e18;

// Representation of an edge: {neighbor, weight}
struct Edge {
    int to;
    long long weight;
};

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    int n, m;
    if (!(cin >> n >> m)) {
        cerr << "Error: Invalid graph dimensions" << endl;
        return 1;
    }

    vector<vector<Edge>> graph(n);

    // Read m bidirectional roads (edges)
    for (int i = 0; i < m; i++) {
        int u, v;
        long long weight;
        cin >> u >> v >> weight;
        if (u >= 0 && u < n && v >= 0 && v < n) {
            graph[u].push_back({v, weight});
            graph[v].push_back({u, weight});
        }
    }

    int source, destination;
    cin >> source >> destination;

    if (source < 0 || source >= n) {
        cout << "No path found\n";
        return 0;
    }

    // Min-heap for Dijkstra's algorithm: {distance, node}
    priority_queue<
        pair<long long, int>,
        vector<pair<long long, int>>,
        greater<pair<long long, int>>
    > pq;

    vector<long long> dist(n, INF);
    vector<int> parent(n, -1);

    dist[source] = 0;
    pq.push({0, source});

    while (!pq.empty()) {
        long long currentDistance = pq.top().first;
        int node = pq.top().second;
        pq.pop();

        if (currentDistance > dist[node]) {
            continue;
        }

        for (const auto& edge : graph[node]) {
            int neighbor = edge.to;
            long long weight = edge.weight;

            if (dist[node] + weight < dist[neighbor]) {
                dist[neighbor] = dist[node] + weight;
                parent[neighbor] = node;
                pq.push({dist[neighbor], neighbor});
            }
        }
    }

    // Single destination query
    if (destination != -1) {
        if (destination < 0 || destination >= n || dist[destination] == INF) {
            cout << "No path found\n";
            return 0;
        }

        vector<int> path;
        for (int node = destination; node != -1; node = parent[node]) {
            path.push_back(node);
        }
        reverse(path.begin(), path.end());

        cout << "Nearest destination: " << destination << "\n";
        cout << "Shortest distance: " << dist[destination] << " km\n";
        cout << "Path: ";
        for (size_t i = 0; i < path.size(); i++) {
            if (i > 0) cout << " -> ";
            cout << path[i];
        }
        cout << "\n";
        return 0;
    }

    // Multi-candidate nearest donor/blood bank search mode:
    // destination == -1, read candidate targets count and list
    int targetCount;
    cin >> targetCount;

    vector<int> targets(targetCount);
    for (int i = 0; i < targetCount; i++) {
        cin >> targets[i];
    }

    int nearestNode = -1;
    long long minDistance = INF;

    for (int target : targets) {
        if (target >= 0 && target < n && dist[target] < minDistance) {
            minDistance = dist[target];
            nearestNode = target;
        }
    }

    if (nearestNode == -1 || minDistance == INF) {
        cout << "No path found\n";
        return 0;
    }

    vector<int> path;
    for (int node = nearestNode; node != -1; node = parent[node]) {
        path.push_back(node);
    }
    reverse(path.begin(), path.end());

    cout << "Nearest destination: " << nearestNode << "\n";
    cout << "Shortest distance: " << minDistance << " km\n";
    cout << "Path: ";
    for (size_t i = 0; i < path.size(); i++) {
        if (i > 0) cout << " -> ";
        cout << path[i];
    }
    cout << "\n";

    // Output all reachable candidate targets with their distances
    cout << "Ranked candidates:\n";
    vector<pair<long long, int>> ranked;
    for (int target : targets) {
        if (target >= 0 && target < n && dist[target] != INF) {
            ranked.push_back({dist[target], target});
        }
    }
    sort(ranked.begin(), ranked.end());
    for (const auto& item : ranked) {
        cout << item.second << " " << item.first << "\n";
    }

    return 0;
}
