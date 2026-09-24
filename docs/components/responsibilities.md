# Component responsibilities

| Responsibility | Owner module |
| --- | --- |
| file discovery | P1-FS |
| parsing framework | P1-PARSE |
| Python extraction | P1-PY |
| graph building | P1-BUILDR |
| graph storage | P1-GRAPH |
| project lifecycle | P1-SESS |
| graph queries | P1-GAPI |
| impact | P1-IMPACT |
| AI context | P1-CTX |
| search | P1-SRCH |
| metrics/hotspots | P1-ANLYS |
| engine process management | P1-DENG |
| UI shell | P1-DSHELL |
| view model | P1-DVIEW |
| 2D rendering | P1-D2D |

## Consistency check

- [ ] Node id format identical in the parser, internal-representation and visualization docs
- [ ] Level numbers identical
- [ ] Metric names identical (loc, complexity, fan_in, fan_out)
- [ ] Every responsibility has exactly one owner
