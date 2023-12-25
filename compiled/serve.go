package main

import (
	"log"
	"net/http"
)

func main() {
	const directory = "./"
	const port = "8080"
	http.Handle("/", http.FileServer(http.Dir(directory)))

	log.Printf("Serving on "+port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}