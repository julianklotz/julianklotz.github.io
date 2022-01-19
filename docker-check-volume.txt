Here’s a note on how to check the contents of a docker volume:

## Case 1: Use the volume name

```
docker run -it --rm -v my_volume:/app busybox
```
This run a container that will be auto-removed on exist, mounting my_volume in `/app`


## Case 2: Mount all volumes from a running container

```
docker run -it --rm --volumes-from my_container:ro busybox
```

Same as above, but mounting all volumes from `my_container` in their “natural” location.


Docs: [docker run](https://docs.docker.com/engine/reference/commandline/run/)
