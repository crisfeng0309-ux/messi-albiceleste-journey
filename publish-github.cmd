@echo off
REM Publish the museum to GitHub Pages using the already-signed-in GitHub CLI.
REM Creates (or reuses) a public repository, pushes the site, and enables Pages.
REM Usage: publish-github.cmd [repo-name]
setlocal
set "NODE=%USERPROFILE%\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe"
if not exist "%NODE%" set "NODE=node"
set "GH=%LOCALAPPDATA%\Programs\GitHubCLI\bin\gh.exe"
if not exist "%GH%" set "GH=gh"
cd /d "%~dp0"
"%NODE%" scripts\publish-github.mjs %1
endlocal
