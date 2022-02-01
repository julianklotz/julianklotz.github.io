# Finding code in git history

Sometimes I wonder how a I solved a certain problem years ago, and all I know is a piece of code I wrote (but deleted at some point).
To search the git history for this specific chunk of code, you can use:

```
git grep "permissions = (" $(git rev-list --all)
```
This will search all revisions that have a line of code containing `permissions = (`

Let’s take a closer look:
The manual says `git rev-list` “lists commit objects in reverse chronological order”. The `--all` switch makes sure we get commits from *all* branches: “Pretend as if all the refs in refs/, along with HEAD, are listed on the command line as <commit>.” 
  
`git grep` lists lines that match a certain pattern, in our case `permissions = (`.
The `$(…)` interpolation passes the list of commits to search for grep.

## Can’t I just use `git grep`, without `rev-list`?
  
Sure you can, but when using `git grep` without arguments, it will only search the current working tree. If the piece of code you are looking for is no longer present, you won’t find anything.

--
Further reading:
git rev-list manual: https://git-scm.com/docs/git-rev-list
git grep manual: https://git-scm.com/docs/git-grep
