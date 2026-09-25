#include "shape.hpp"
#include "util.h"
int Square::area() const {
    return twice(side) * side / 2;
}
