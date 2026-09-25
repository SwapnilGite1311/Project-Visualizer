package main

import (
	"fmt"

	"github.com/acme/shop/internal/store"
)

func main() {
	s := store.New()
	fmt.Println(s.Count())
	run()
}

func run() {
	fmt.Println("run")
}
