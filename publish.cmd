@echo off
REM Sign in to Vercel so the museum can be published to a public URL.
REM Usage:
REM   publish.cmd login     sign in (opens a browser approval)
REM   publish.cmd deploy    publish to production
REM   publish.cmd whoami    show the signed-in account
setlocal
set "NODE=%USERPROFILE%\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe"
if not exist "%NODE%" set "NODE=node"
cd /d "%~dp0"

if "%~1"=="" (
  echo.
  echo   Usage: publish.cmd login ^| deploy ^| whoami
  echo.
  echo   1^) publish.cmd login    sign in to Vercel
  echo   2^) publish.cmd deploy   publish and print the public URL
  echo.
  exit /b 0
)

"%NODE%" scripts\setup-vercel.mjs %*
endlocal
