#include "pv/rpc/framing.hpp"

#include "pv/core/error.hpp"
#include "pv/core/text.hpp"

namespace pv::rpc {

std::optional<std::string> read_message(std::istream& in) {
    if (in.peek() == std::char_traits<char>::eof()) return std::nullopt;

    bool has_length = false;
    std::size_t length = 0;
    std::string line;
    while (true) {
        if (!std::getline(in, line)) throw core::PvError(core::err::ParseError, "bad message header");
        if (!line.empty() && line.back() == '\r') line.pop_back();
        if (line.empty()) break;
        const std::size_t colon = line.find(':');
        if (colon == std::string::npos) continue;
        if (core::to_lower(core::trim(line.substr(0, colon))) == "content-length") {
            try {
                length = std::stoul(core::trim(line.substr(colon + 1)));
                has_length = true;
            } catch (const std::exception&) {
                throw core::PvError(core::err::ParseError, "bad message header");
            }
        }
    }
    if (!has_length) throw core::PvError(core::err::ParseError, "bad message header");

    std::string body(length, '\0');
    in.read(body.data(), static_cast<std::streamsize>(length));
    if (static_cast<std::size_t>(in.gcount()) != length) {
        throw core::PvError(core::err::ParseError, "truncated message body");
    }
    return body;
}

void write_message(std::ostream& out, const std::string& body) {
    out << "Content-Length: " << std::to_string(body.size()) << "\r\n\r\n" << body;
    out.flush();
}

}  // namespace pv::rpc
