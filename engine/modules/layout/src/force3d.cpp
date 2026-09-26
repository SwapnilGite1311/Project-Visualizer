#include <algorithm>
#include <array>
#include <cmath>
#include <cstdint>
#include <map>
#include <memory>
#include <random>

#include "pv/layout/layout.hpp"

namespace pv::layout {

namespace {

struct V3 {
    double x = 0, y = 0, z = 0;
    V3 operator+(const V3& o) const { return {x + o.x, y + o.y, z + o.z}; }
    V3 operator-(const V3& o) const { return {x - o.x, y - o.y, z - o.z}; }
    V3 operator*(double s) const { return {x * s, y * s, z * s}; }
    V3& operator+=(const V3& o) {
        x += o.x;
        y += o.y;
        z += o.z;
        return *this;
    }
    double len() const { return std::sqrt(x * x + y * y + z * z); }
};

// Barnes-Hut octree for the repulsive forces of large graphs.
class Octree {
public:
    Octree(const std::vector<V3>& pts) : pts_(pts) {
        V3 lo = pts[0], hi = pts[0];
        for (const V3& p : pts) {
            lo = {std::min(lo.x, p.x), std::min(lo.y, p.y), std::min(lo.z, p.z)};
            hi = {std::max(hi.x, p.x), std::max(hi.y, p.y), std::max(hi.z, p.z)};
        }
        const double size = std::max({hi.x - lo.x, hi.y - lo.y, hi.z - lo.z, 1.0});
        cells_.push_back(Cell{(lo + hi) * 0.5, size / 2});
        for (int i = 0; i < static_cast<int>(pts.size()); ++i) insert(0, i, 0);
    }

    // Repulsion on point i: sum of k^2 / d along the direction away from each (group of) other point(s).
    V3 force(int i, double k2, double theta) const {
        V3 f;
        visit(0, i, k2, theta, f);
        return f;
    }

private:
    struct Cell {
        V3 centre;
        double half = 0;
        V3 mass_centre;
        int count = 0;
        int point = -1;                  // the single point of a leaf
        std::array<int, 8> child{-1, -1, -1, -1, -1, -1, -1, -1};
        bool leaf = true;
    };

    int child_index(const Cell& c, const V3& p) const {
        return (p.x > c.centre.x ? 1 : 0) | (p.y > c.centre.y ? 2 : 0) | (p.z > c.centre.z ? 4 : 0);
    }

    int make_child(int cell, int idx) {
        const Cell parent = cells_[static_cast<std::size_t>(cell)];
        const double h = parent.half / 2;
        const V3 c = parent.centre + V3{idx & 1 ? h : -h, idx & 2 ? h : -h, idx & 4 ? h : -h};
        cells_.push_back(Cell{c, h});
        const int id = static_cast<int>(cells_.size()) - 1;
        cells_[static_cast<std::size_t>(cell)].child[static_cast<std::size_t>(idx)] = id;
        return id;
    }

    void insert(int cell, int i, int depth) {
        Cell& c = cells_[static_cast<std::size_t>(cell)];
        const V3& p = pts_[static_cast<std::size_t>(i)];
        c.mass_centre = (c.mass_centre * c.count + p) * (1.0 / (c.count + 1));
        ++c.count;
        if (c.leaf && c.point < 0) {
            c.point = i;
            return;
        }
        if (depth > 40) return;  // identical points: keep them lumped together
        if (c.leaf) {
            const int old = c.point;
            cells_[static_cast<std::size_t>(cell)].leaf = false;
            cells_[static_cast<std::size_t>(cell)].point = -1;
            const int oi = child_index(cells_[static_cast<std::size_t>(cell)], pts_[static_cast<std::size_t>(old)]);
            int oc = cells_[static_cast<std::size_t>(cell)].child[static_cast<std::size_t>(oi)];
            if (oc < 0) oc = make_child(cell, oi);
            insert_leafwise(oc, old, depth + 1);
        }
        const int ni = child_index(cells_[static_cast<std::size_t>(cell)], p);
        int nc = cells_[static_cast<std::size_t>(cell)].child[static_cast<std::size_t>(ni)];
        if (nc < 0) nc = make_child(cell, ni);
        insert(nc, i, depth + 1);
    }

    void insert_leafwise(int cell, int i, int depth) { insert(cell, i, depth); }

    void visit(int cell, int i, double k2, double theta, V3& f) const {
        const Cell& c = cells_[static_cast<std::size_t>(cell)];
        if (c.count == 0) return;
        if (c.leaf && c.point == i && c.count == 1) return;
        const V3 delta = pts_[static_cast<std::size_t>(i)] - c.mass_centre;
        const double d = std::max(delta.len(), 0.01);
        if (c.leaf || (2 * c.half) / d < theta) {
            if (c.leaf && c.point == i) return;
            f += delta * (k2 * c.count / (d * d));
            return;
        }
        for (const int ch : c.child) {
            if (ch >= 0) visit(ch, i, k2, theta, f);
        }
    }

    const std::vector<V3>& pts_;
    std::vector<Cell> cells_;
};

uint64_t seed_of(const std::vector<LNode>& nodes) {
    uint64_t h = 14695981039346656037ULL;
    for (const LNode& n : nodes) {
        for (const unsigned char c : n.id) {
            h ^= c;
            h *= 1099511628211ULL;
        }
        h ^= 0xff;
        h *= 1099511628211ULL;
    }
    return h;
}

}  // namespace

LayoutResult force3d(const std::vector<LNode>& input_nodes, const std::vector<LEdge>& input_edges, int iterations) {
    LayoutResult result;
    std::vector<LNode> nodes = input_nodes;
    std::sort(nodes.begin(), nodes.end(), [](const LNode& a, const LNode& b) { return a.id < b.id; });
    const int n = static_cast<int>(nodes.size());
    if (n == 0) return result;
    std::map<std::string, int> index;
    for (int i = 0; i < n; ++i) index[nodes[static_cast<std::size_t>(i)].id] = i;
    std::vector<std::pair<int, int>> edges;
    for (const LEdge& e : input_edges) {
        const auto s = index.find(e.source), t = index.find(e.target);
        if (s != index.end() && t != index.end() && s->second != t->second) edges.emplace_back(s->second, t->second);
    }

    const double k = 60;  // ideal edge length
    const double radius = k * std::cbrt(static_cast<double>(n));
    std::mt19937_64 rng(seed_of(nodes));
    std::uniform_real_distribution<double> uni(-radius, radius);
    std::vector<V3> p(static_cast<std::size_t>(n));
    for (V3& v : p) v = {uni(rng), uni(rng), uni(rng)};

    double t = radius / 2;
    const double cool = t / std::max(iterations, 1);
    const double k2 = k * k;
    for (int it = 0; it < iterations; ++it) {
        std::vector<V3> disp(static_cast<std::size_t>(n));
        if (n <= 500) {
            for (int i = 0; i < n; ++i) {
                for (int j = i + 1; j < n; ++j) {
                    const V3 delta = p[static_cast<std::size_t>(i)] - p[static_cast<std::size_t>(j)];
                    const double d = std::max(delta.len(), 0.01);
                    const V3 f = delta * (k2 / (d * d));
                    disp[static_cast<std::size_t>(i)] += f;
                    disp[static_cast<std::size_t>(j)] += f * -1.0;
                }
            }
        } else {
            const Octree tree(p);
            for (int i = 0; i < n; ++i) disp[static_cast<std::size_t>(i)] += tree.force(i, k2, 0.8);
        }
        for (const auto& [u, v] : edges) {
            const V3 delta = p[static_cast<std::size_t>(u)] - p[static_cast<std::size_t>(v)];
            const double d = std::max(delta.len(), 0.01);
            const V3 f = delta * (d / k);  // |f| = d^2 / k
            disp[static_cast<std::size_t>(u)] += f * -1.0;
            disp[static_cast<std::size_t>(v)] += f;
        }
        for (int i = 0; i < n; ++i) {
            V3& d = disp[static_cast<std::size_t>(i)];
            d += p[static_cast<std::size_t>(i)] * -0.02;  // gentle gravity keeps separate groups near each other
            const double len = d.len();
            if (len > 0) p[static_cast<std::size_t>(i)] += d * (std::min(len, t) / len);
        }
        t = std::max(t - cool, 0.5);
    }

    V3 centre;
    for (const V3& v : p) centre += v;
    centre = centre * (1.0 / n);
    for (int i = 0; i < n; ++i) {
        const V3 v = p[static_cast<std::size_t>(i)] - centre;
        result.positions[nodes[static_cast<std::size_t>(i)].id] = Point{v.x, v.y, v.z};
    }
    return result;
}

}  // namespace pv::layout
