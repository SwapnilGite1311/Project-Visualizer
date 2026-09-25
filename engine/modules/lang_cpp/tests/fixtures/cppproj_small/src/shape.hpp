#pragma once
#include "util.h"
class Shape {
public:
    virtual int area() const = 0;
};
class Square : public Shape {
public:
    explicit Square(int s) : side(s) {}
    int area() const override;
private:
    int side;
};
