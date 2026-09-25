#pragma once
// Test helpers: one real-looking stack trace per supported language.
#include <string>

namespace pv::errmap::testing {

inline std::string python_trace(const std::string& root) {
    return "Traceback (most recent call last):\n"
           "  File \"" + root + "/main.py\", line 9, in main\n"
           "    user = service.get_user(1)\n"
           "  File \"" + root + "/app/services.py\", line 9, in get_user\n"
           "    if not is_valid(user_id):\n"
           "  File \"" + root + "/app/utils.py\", line 9, in is_valid\n"
           "    return user_id > 0 and user_id < 1000\n"
           "ValueError: bad id\n";
}

inline const std::string kNode =
    "TypeError: Cannot read properties of undefined (reading 'trim')\n"
    "    at formatName (C:\\app\\src\\utils\\format.js:2:21)\n"
    "    at main (C:\\app\\src\\index.js:7:16)\n"
    "    at node:internal/main/run_main_module:28:49\n";

inline const std::string kJava =
    "Exception in thread \"main\" java.lang.IllegalStateException: boom\n"
    "\tat com.acme.util.Helper.greet(Helper.java:6)\n"
    "\tat com.acme.App.main(App.java:10)\n"
    "Caused by: java.lang.NullPointerException\n"
    "\tat com.acme.util.Helper.format(Helper.java:11)\n"
    "\t... 2 more\n";

inline const std::string kGo =
    "panic: runtime error: index out of range [3] with length 3\n"
    "\n"
    "goroutine 1 [running]:\n"
    "main.(*Store).Count(0xc000010000)\n"
    "\t/home/u/shop/internal/store/store.go:17 +0x1d\n"
    "main.main()\n"
    "\t/home/u/shop/main.go:11 +0x25\n"
    "exit status 2\n";

inline const std::string kCsharp =
    "System.InvalidOperationException: Sequence contains no elements\n"
    "   at System.Linq.Enumerable.First[TSource](IEnumerable`1 source)\n"
    "   at Shop.Services.OrderService.Latest() in C:\\shop\\Services\\OrderService.cs:line 42\n"
    "   at Shop.Program.Main(String[] args) in C:\\shop\\Program.cs:line 10\n";

inline const std::string kGeneric = "something failed near src/lib/parse.rb:31 called from src/app.rb:7\n";

}  // namespace pv::errmap::testing
