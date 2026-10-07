@echo off
REM MESSI · THE ALBICELESTE JOURNEY — local preview
REM Serves the museum at http://127.0.0.1:4173 using the bundled Node runtime.
setlocal
set "NODE=%USERPROFILE%\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe"
if not exist "%NODE%" set "NODE=node"
cd /d "%~dp0"
echo.
echo   MESSI - THE ALBICELESTE JOURNEY
echo   2005 - 2026
echo.
echo   Local:    http://127.0.0.1:4173/
echo   Self test: http://127.0.0.1:4173/self-test.html
echo   Press Ctrl+C to stop.
echo.
"%NODE%" scripts\serve.mjs 4173
endlocal
