#ifndef __THIS_IS_AN_EXAMPLE__
#define __THIS_IS_AN_EXAMPLE__

#include <iostream>

template <typename Type>
class Class {
private:
  Type x;
public:
  Type y;
  Class(Type &x_in, Type &y_in): x{x_in - 1}, y{y_in + 1} {}
};

int main() {
  std::cout << "Hello, world!" << std::endl;
  return 0;
}

#endif
