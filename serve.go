package main

import (
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
)

func main() {
	PDNS_URL, err := url.Parse("http://localhost:8081")
	if err != nil {
		log.Fatal(err)
	}

	SURL_URL, err := url.Parse("http://localhost:8001")
	if err != nil {
		log.Fatal(err)
	}

	http.Handle("/", http.FileServer(http.Dir("")))
	http.Handle("/pdns/", http.StripPrefix("/pdns/", httputil.NewSingleHostReverseProxy(PDNS_URL)))
	http.Handle("/surl/", http.StripPrefix("/surl/", httputil.NewSingleHostReverseProxy(SURL_URL)))

	http.ListenAndServe(":8000", nil)
}
