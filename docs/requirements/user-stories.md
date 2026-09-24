# User stories

| ID | As a | I want to | So that | User does | System produces | Phase |
|---|---|---|---|---|---|---|
| US-01 | Riya | open a project folder | see my project | selects a folder | a 2D map of top-level packages/modules | 1 |
| US-02 | Riya | drill into a node | see what is inside | double-clicks a node | the node's children and links between them | 1 |
| US-03 | Riya | go back up | keep my bearings | clicks a breadcrumb item | the parent level view | 1 |
| US-04 | Riya | see a node's code | connect map and code | selects a node | details and source code in the inspector | 1 |
| US-05 | Riya | get an explanation | understand code without reading it all | clicks Explain | a plain-language explanation with clickable references | 1 |
| US-06 | Riya | see what breaks | change safely | clicks What breaks? | highlighted dependents, a list and a risk level | 1 |
| US-07 | Arjun | search by name | find things fast | types in search | ranked matching nodes; clicking one navigates to it | 1 |
| US-08 | Meera | see hotspots | know where risk is | opens Insights | ranked list of complex/coupled nodes with reasons | 1 |
| US-09 | Arjun | import from Git | analyze without cloning manually | pastes a Git URL | the repository is cloned and opened | 1 |
| US-10 | Riya | switch to 3D | explore large structures | toggles 3D | the same level view in 3D | 1 |
| US-11 | Meera | follow dependencies | understand coupling | uses Dependencies panel | forward/reverse lists, paths, cycles | 2 |
| US-12 | Arjun | jump from VS Code to the map | stay in flow | runs a VS Code command | the desktop app focuses that file's node | 2 |
| US-13 | Meera | share a snapshot | onboard teammates | clicks Share | teammates open the same map | 2 |
| US-14 | Arjun | watch my app run | see real behaviour | runs app with the agent | animated flows on the map | 3 |
| US-15 | Arjun | see where it stalls | find hangs | runs app | stalled nodes turn red with a stall badge | 3 |
| US-16 | Riya | paste an error | find where it happened | pastes a stack trace | frames mapped to nodes and highlighted | 3 |
| US-17 | Riya | understand an error | fix it | clicks Explain error | cause, fix suggestions, references | 4 |
| US-18 | Riya | see my fix confirmed | trust the fix | saves the file | error state clears when the fix works | 4 |
| US-19 | Meera | preview a change | decide safely | chooses a change type on a node | affected nodes + risk score + factors | 4 |
| US-20 | Riya | ask questions | learn the codebase | asks in chat | grounded answer with highlighted nodes | 4 |
| US-21 | Arjun | give my AI agent the map | better AI edits | connects MCP | agent can query dependencies and impact | 4 |
| US-22 | David | time-travel | see how architecture evolved | moves a commit slider | map of that commit + differences | 5 |
| US-23 | David | simulate a change | avoid regressions | applies changes in a sandbox and runs | side-by-side real vs simulated | 5 |
| US-24 | David | forecast health | act early | opens Forecast | modules with predicted degradation | 5 |
| US-25 | Meera | get a recommendation | decide faster | opens Recommendation | verdict + confidence + reasons | 5 |
| US-26 | Meera | pay for a team plan | use team features | subscribes | plan active, features unlocked | 6 |
| US-27 | David | sign in with company SSO | meet policy | clicks SSO login | signed in via company identity provider | 6 |
