#include <algorithm>
#include <cmath>
#include <map>
#include <numeric>
#include <queue>
#include <set>
#include <utility>

#include "pv/layout/layout.hpp"

namespace pv::layout {

namespace {

struct VNode {
    int real = -1;    // index of the real node; -1 = dummy
    double along = 0;  // size along the order axis (width in TB)
    double across = 0; // size along the rank axis (height in TB)
    int rank = 0;
};

// Number of crossings between two adjacent layers (small graphs only; used to keep the best ordering).
long crossings(const std::vector<std::vector<int>>& layers, const std::vector<std::vector<int>>& down,
               const std::vector<int>& pos) {
    long total = 0;
    for (std::size_t r = 0; r + 1 < layers.size(); ++r) {
        std::vector<std::pair<int, int>> es;
        for (const int u : layers[r]) {
            for (const int v : down[static_cast<std::size_t>(u)]) es.emplace_back(pos[static_cast<std::size_t>(u)], pos[static_cast<std::size_t>(v)]);
        }
        for (std::size_t i = 0; i < es.size(); ++i) {
            for (std::size_t j = i + 1; j < es.size(); ++j) {
                if ((es[i].first < es[j].first && es[i].second > es[j].second) ||
                    (es[i].first > es[j].first && es[i].second < es[j].second)) {
                    ++total;
                }
            }
        }
    }
    return total;
}

}  // namespace

LayoutResult layered(const std::vector<LNode>& input_nodes, const std::vector<LEdge>& input_edges, const LayeredOptions& options) {
    LayoutResult result;
    const bool lr = options.rankdir == "LR";

    // Real nodes sorted by id: the same graph always gives the same picture.
    std::vector<LNode> nodes = input_nodes;
    std::sort(nodes.begin(), nodes.end(), [](const LNode& a, const LNode& b) { return a.id < b.id; });
    std::map<std::string, int> index;
    for (std::size_t i = 0; i < nodes.size(); ++i) index[nodes[i].id] = static_cast<int>(i);
    const int n = static_cast<int>(nodes.size());

    // Unique directed edges between different known nodes.
    struct E { int u, v; std::size_t edge; };
    std::vector<E> edges;
    std::set<std::pair<int, int>> seen;
    std::vector<int> degree(static_cast<std::size_t>(n), 0);
    for (std::size_t k = 0; k < input_edges.size(); ++k) {
        const auto s = index.find(input_edges[k].source);
        const auto t = index.find(input_edges[k].target);
        if (s == index.end() || t == index.end() || s->second == t->second) continue;
        edges.push_back(E{s->second, t->second, k});
        if (seen.insert({s->second, t->second}).second) {
            ++degree[static_cast<std::size_t>(s->second)];
            ++degree[static_cast<std::size_t>(t->second)];
        }
    }

    // 1. Break cycles: reverse DFS back edges.
    std::vector<std::vector<int>> out(static_cast<std::size_t>(n));
    for (const auto& [u, v] : seen) out[static_cast<std::size_t>(u)].push_back(v);
    std::set<std::pair<int, int>> reversed;
    {
        std::vector<int> state(static_cast<std::size_t>(n), 0);  // 0 new, 1 on stack, 2 done
        for (int start = 0; start < n; ++start) {
            if (state[static_cast<std::size_t>(start)] != 0) continue;
            std::vector<std::pair<int, std::size_t>> stack{{start, 0}};
            state[static_cast<std::size_t>(start)] = 1;
            while (!stack.empty()) {
                auto& [u, next] = stack.back();
                const auto& succ = out[static_cast<std::size_t>(u)];
                if (next < succ.size()) {
                    const int v = succ[next++];
                    if (state[static_cast<std::size_t>(v)] == 1) reversed.insert({u, v});
                    else if (state[static_cast<std::size_t>(v)] == 0) {
                        state[static_cast<std::size_t>(v)] = 1;
                        stack.emplace_back(v, 0);
                    }
                } else {
                    state[static_cast<std::size_t>(u)] = 2;
                    stack.pop_back();
                }
            }
        }
    }
    std::set<std::pair<int, int>> dag;  // edges of the acyclic graph
    for (const auto& [u, v] : seen) {
        if (reversed.count({u, v})) dag.insert({v, u});
        else dag.insert({u, v});
    }

    // 2. Ranks by longest path (Kahn order).
    std::vector<int> rank(static_cast<std::size_t>(n), 0), indeg(static_cast<std::size_t>(n), 0);
    std::vector<std::vector<int>> dag_out(static_cast<std::size_t>(n));
    for (const auto& [u, v] : dag) {
        dag_out[static_cast<std::size_t>(u)].push_back(v);
        ++indeg[static_cast<std::size_t>(v)];
    }
    {
        std::queue<int> q;
        for (int i = 0; i < n; ++i) {
            if (indeg[static_cast<std::size_t>(i)] == 0) q.push(i);
        }
        while (!q.empty()) {
            const int u = q.front();
            q.pop();
            for (const int v : dag_out[static_cast<std::size_t>(u)]) {
                rank[static_cast<std::size_t>(v)] = std::max(rank[static_cast<std::size_t>(v)], rank[static_cast<std::size_t>(u)] + 1);
                if (--indeg[static_cast<std::size_t>(v)] == 0) q.push(v);
            }
        }
    }

    // 3. Virtual graph: real connected nodes plus dummy nodes on long edges.
    std::vector<VNode> vn;
    std::vector<int> vindex(static_cast<std::size_t>(n), -1);
    for (int i = 0; i < n; ++i) {
        if (degree[static_cast<std::size_t>(i)] == 0) continue;
        const LNode& nd = nodes[static_cast<std::size_t>(i)];
        vindex[static_cast<std::size_t>(i)] = static_cast<int>(vn.size());
        vn.push_back(VNode{i, lr ? nd.h : nd.w, lr ? nd.w : nd.h, rank[static_cast<std::size_t>(i)]});
    }
    std::vector<std::vector<int>> down(vn.size()), up(vn.size());
    std::map<std::pair<int, int>, std::vector<int>> chains;  // dag edge -> vnode chain from u to v
    for (const auto& [u, v] : dag) {
        std::vector<int> chain{vindex[static_cast<std::size_t>(u)]};
        for (int r = rank[static_cast<std::size_t>(u)] + 1; r < rank[static_cast<std::size_t>(v)]; ++r) {
            chain.push_back(static_cast<int>(vn.size()));
            vn.push_back(VNode{-1, 2, 2, r});
            down.emplace_back();
            up.emplace_back();
        }
        chain.push_back(vindex[static_cast<std::size_t>(v)]);
        for (std::size_t k = 0; k + 1 < chain.size(); ++k) {
            down[static_cast<std::size_t>(chain[k])].push_back(chain[k + 1]);
            up[static_cast<std::size_t>(chain[k + 1])].push_back(chain[k]);
        }
        chains[{u, v}] = std::move(chain);
    }

    int max_rank = 0;
    for (const VNode& v : vn) max_rank = std::max(max_rank, v.rank);
    std::vector<std::vector<int>> layers(vn.empty() ? 0 : static_cast<std::size_t>(max_rank + 1));
    for (std::size_t i = 0; i < vn.size(); ++i) layers[static_cast<std::size_t>(vn[i].rank)].push_back(static_cast<int>(i));
    std::vector<int> pos(vn.size(), 0);
    auto renumber = [&] {
        for (const auto& layer : layers) {
            for (std::size_t k = 0; k < layer.size(); ++k) pos[static_cast<std::size_t>(layer[k])] = static_cast<int>(k);
        }
    };
    renumber();

    // 4. Order each rank by the barycenter of its neighbours; keep the ordering with the fewest crossings.
    std::size_t layered_edges = 0;
    for (const auto& d : down) layered_edges += d.size();
    const bool count = layered_edges <= 3000;
    auto best_layers = layers;
    long best = count ? crossings(layers, down, pos) : 0;
    for (int sweep = 0; sweep < 8; ++sweep) {
        const bool downward = sweep % 2 == 0;
        auto order_layer = [&](std::vector<int>& layer, const std::vector<std::vector<int>>& neighbours) {
            std::vector<std::pair<double, int>> keyed;
            for (const int v : layer) {
                const auto& nb = neighbours[static_cast<std::size_t>(v)];
                double key = pos[static_cast<std::size_t>(v)];
                if (!nb.empty()) {
                    double sum = 0;
                    for (const int w : nb) sum += pos[static_cast<std::size_t>(w)];
                    key = sum / static_cast<double>(nb.size());
                }
                keyed.emplace_back(key, v);
            }
            std::stable_sort(keyed.begin(), keyed.end(), [](const auto& a, const auto& b) { return a.first < b.first; });
            for (std::size_t k = 0; k < layer.size(); ++k) {
                layer[k] = keyed[k].second;
                pos[static_cast<std::size_t>(keyed[k].second)] = static_cast<int>(k);
            }
        };
        if (downward) {
            for (std::size_t r = 1; r < layers.size(); ++r) order_layer(layers[r], up);
        } else {
            for (std::size_t r = layers.size(); r-- > 1;) order_layer(layers[r - 1], down);
        }
        if (count) {
            const long c = crossings(layers, down, pos);
            if (c < best) {
                best = c;
                best_layers = layers;
            }
        } else {
            best_layers = layers;
        }
    }
    layers = best_layers;
    renumber();

    // 5. Coordinates along the order axis: pack, then pull each node toward its neighbours, keeping the order.
    std::vector<double> x(vn.size(), 0);
    auto sep = [&](int a, int b) {
        const double gap = (vn[static_cast<std::size_t>(a)].real < 0 || vn[static_cast<std::size_t>(b)].real < 0) ? options.nodesep / 2 : options.nodesep;
        return vn[static_cast<std::size_t>(a)].along / 2 + gap + vn[static_cast<std::size_t>(b)].along / 2;
    };
    for (const auto& layer : layers) {
        for (std::size_t k = 1; k < layer.size(); ++k) x[static_cast<std::size_t>(layer[k])] = x[static_cast<std::size_t>(layer[k - 1])] + sep(layer[k - 1], layer[k]);
    }
    // Pull every node of a rank toward its neighbours in the next rank up or down, keeping the order and gaps.
    auto balance = [&](const std::vector<int>& layer, bool use_up) {
        if (layer.empty()) return;
        std::vector<double> desired(layer.size());
        for (std::size_t k = 0; k < layer.size(); ++k) {
            const int v = layer[k];
            const auto& nb = use_up ? up[static_cast<std::size_t>(v)] : down[static_cast<std::size_t>(v)];
            if (nb.empty()) {
                desired[k] = x[static_cast<std::size_t>(v)];
            } else {
                double sum = 0;
                for (const int w : nb) sum += x[static_cast<std::size_t>(w)];
                desired[k] = sum / static_cast<double>(nb.size());
            }
        }
        std::vector<double> placed(layer.size());
        placed[0] = desired[0];
        for (std::size_t k = 1; k < layer.size(); ++k) placed[k] = std::max(desired[k], placed[k - 1] + sep(layer[k - 1], layer[k]));
        // Shift the whole rank so it sits, on average, where its nodes want to be.
        double shift = 0;
        for (std::size_t k = 0; k < layer.size(); ++k) shift += desired[k] - placed[k];
        shift /= static_cast<double>(layer.size());
        for (std::size_t k = 0; k < layer.size(); ++k) x[static_cast<std::size_t>(layer[k])] = placed[k] + shift;
    };
    for (int iter = 0; iter < 8; ++iter) {
        for (const auto& layer : layers) balance(layer, iter % 2 == 0);
    }

    // 5b. A very wide rank (e.g. a package that imports dozens of libraries) wraps onto several rows, in its
    // crossing-minimised order, centred where the rank was; otherwise the whole level would be one long line.
    std::size_t real_count = 0;
    for (const VNode& v : vn) real_count += v.real >= 0 ? 1 : 0;
    const std::size_t max_row = options.max_row > 0
        ? static_cast<std::size_t>(options.max_row)
        : std::max<std::size_t>(6, static_cast<std::size_t>(std::ceil(1.3 * std::sqrt(static_cast<double>(real_count)))));
    std::vector<int> row_of(vn.size(), 0);
    std::vector<std::size_t> rows_in(layers.size(), 1);
    for (std::size_t r = 0; r < layers.size(); ++r) {
        const auto& layer = layers[r];
        if (layer.size() <= max_row) continue;
        const std::size_t rows = (layer.size() + max_row - 1) / max_row;
        const std::size_t per = (layer.size() + rows - 1) / rows;
        const auto half = [&](int v) { return vn[static_cast<std::size_t>(v)].along / 2; };
        const double centre = (x[static_cast<std::size_t>(layer.front())] - half(layer.front()) + x[static_cast<std::size_t>(layer.back())] + half(layer.back())) / 2;
        for (std::size_t j = 0; j * per < layer.size(); ++j) {
            const std::size_t b = j * per, e = std::min(layer.size(), b + per);
            std::vector<double> px(e - b, 0);
            for (std::size_t k = b + 1; k < e; ++k) px[k - b] = px[k - b - 1] + sep(layer[k - 1], layer[k]);
            const double mid = (px.front() - half(layer[b]) + px.back() + half(layer[e - 1])) / 2;
            for (std::size_t k = b; k < e; ++k) {
                x[static_cast<std::size_t>(layer[k])] = px[k - b] - mid + centre;
                row_of[static_cast<std::size_t>(layer[k])] = static_cast<int>(j);
            }
        }
        rows_in[r] = rows;
    }
    // The other ranks (and the bend points of long edges) follow the wrapped rows again.
    if (std::any_of(rows_in.begin(), rows_in.end(), [](std::size_t n) { return n > 1; })) {
        for (int iter = 0; iter < 8; ++iter) {
            for (std::size_t r = 0; r < layers.size(); ++r) {
                if (rows_in[r] == 1) balance(layers[r], iter % 2 == 0);
            }
        }
    }

    // 6. Coordinates along the rank axis (rows of a wrapped rank sit half a rank gap apart).
    std::vector<std::vector<double>> row_centre(layers.size());
    double cursor = 0;
    for (std::size_t r = 0; r < layers.size(); ++r) {
        double thick = 0;
        for (const int v : layers[r]) thick = std::max(thick, vn[static_cast<std::size_t>(v)].across);
        row_centre[r].resize(rows_in[r]);
        for (std::size_t j = 0; j < rows_in[r]; ++j) {
            row_centre[r][j] = cursor + thick / 2;
            cursor += thick + (j + 1 < rows_in[r] ? options.ranksep / 2 : options.ranksep);
        }
    }
    const auto across_of = [&](std::size_t i) {
        return row_centre[static_cast<std::size_t>(vn[i].rank)][static_cast<std::size_t>(row_of[i])];
    };

    // Normalize the layered part to start at 0 on the order axis.
    double min_x = 0, max_x = 0;
    bool any = false;
    for (std::size_t i = 0; i < vn.size(); ++i) {
        const double left = x[i] - vn[i].along / 2, right = x[i] + vn[i].along / 2;
        min_x = any ? std::min(min_x, left) : left;
        max_x = any ? std::max(max_x, right) : right;
        any = true;
    }
    for (double& v : x) v -= min_x;
    const double width = any ? max_x - min_x : 0;

    auto emit = [&](double along, double across) { return lr ? Point{across, along, 0} : Point{along, across, 0}; };
    for (std::size_t i = 0; i < vn.size(); ++i) {
        if (vn[i].real < 0) continue;
        result.positions[nodes[static_cast<std::size_t>(vn[i].real)].id] = emit(x[i], across_of(i));
    }

    // 7. Nodes without edges: a grid after the layered part.
    std::vector<int> lonely;
    for (int i = 0; i < n; ++i) {
        if (degree[static_cast<std::size_t>(i)] == 0) lonely.push_back(i);
    }
    if (!lonely.empty()) {
        double cell_along = 0, cell_across = 0;
        for (const int i : lonely) {
            const LNode& nd = nodes[static_cast<std::size_t>(i)];
            cell_along = std::max(cell_along, lr ? nd.h : nd.w);
            cell_across = std::max(cell_across, lr ? nd.w : nd.h);
        }
        const double pitch = cell_along + options.nodesep;
        const int by_width = width > 0 ? static_cast<int>(std::floor((width + options.nodesep) / pitch)) : 0;
        const int cols = std::max({1, by_width, static_cast<int>(std::ceil(std::sqrt(static_cast<double>(lonely.size()))))});
        const double start = any ? cursor : 0;
        for (std::size_t k = 0; k < lonely.size(); ++k) {
            const int row = static_cast<int>(k) / cols, col = static_cast<int>(k) % cols;
            result.positions[nodes[static_cast<std::size_t>(lonely[k])].id] =
                emit(col * pitch + cell_along / 2, start + row * (cell_across + options.ranksep / 2) + cell_across / 2);
        }
    }

    // 8. Edge polylines through the dummy nodes (in the original direction).
    for (const E& e : edges) {
        const bool rev = reversed.count({e.u, e.v}) > 0;
        const auto it = chains.find(rev ? std::make_pair(e.v, e.u) : std::make_pair(e.u, e.v));
        if (it == chains.end()) continue;
        std::vector<int> chain = it->second;
        if (rev) std::reverse(chain.begin(), chain.end());
        std::vector<Point> pts;
        for (const int v : chain) pts.push_back(emit(x[static_cast<std::size_t>(v)], across_of(static_cast<std::size_t>(v))));
        result.edge_points[input_edges[e.edge].id] = std::move(pts);
    }
    return result;
}

}  // namespace pv::layout
