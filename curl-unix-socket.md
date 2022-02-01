More things I didn’t know: cURL can connect to UNIX sockets by using `--unix-socket`.

```
curl --unix-socket /var/run/docker.sock http://localhost/images/json```
```

If you happen to run Docker on a Linux machine, this command will list all Docker images.
I found out when looking for a way to connect to the Docker API without any setup on the host machine and without exposing any public ports.

By the way – Daniel, one of cURLs makers posted about how a big company inquired about Log4J vulnerabilities:
[LogJ4 Security Inquiry – Response Required](https://daniel.haxx.se/blog/2022/01/24/logj4-security-inquiry-response-required/)

--

Further reading:
* cURL man page: https://curl.se/docs/manpage.html#--unix-socket
