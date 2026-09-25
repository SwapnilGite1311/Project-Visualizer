#include <iostream>
#include "shape.hpp"
int main() {
    Square sq(3);
    std::cout << sq.area() << std::endl;
    return 0;
}
