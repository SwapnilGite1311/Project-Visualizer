# P1-SRCH-002 — expected order in the plan misses format_user

The plan expects results[2] = get_user and results[3] = get_user_route for the text "user". The method
`UserService.format_user` also contains "user" (score 60, level 4) and, by the plan's own ordering rule
(score desc, level asc, name asc), sorts first among the score-60 matches. The implementation follows the rule;
the test expects format_user, get_user, get_user_route at positions 2-4.
