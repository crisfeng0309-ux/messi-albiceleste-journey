# scripts/fix-browser-proxy.ps1
#
# A broken localhost proxy in the Windows "Internet Settings" key makes
# Chrome/Edge unable to reach ANY site ("the proxy server may be down, or the
# address may be incorrect"). This turns it off, after saving the previous
# settings next to the script so they can be restored.
#
#   powershell -ExecutionPolicy Bypass -File scripts/fix-browser-proxy.ps1
#   powershell -ExecutionPolicy Bypass -File scripts/fix-browser-proxy.ps1 -Restore

param(
  [switch]$Restore,
  [switch]$Status
)

$ErrorActionPreference = 'Stop'
$key = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings'
$backup = Join-Path $PSScriptRoot 'proxy-settings-backup.txt'

function Show-State($label) {
  $p = Get-ItemProperty -Path $key
  Write-Host "$label"
  Write-Host "  ProxyEnable : $($p.ProxyEnable)"
  Write-Host "  ProxyServer : $($p.ProxyServer)"
  Write-Host "  AutoConfig  : $($p.AutoConfigURL)"
}

function Notify-Change {
  # tell WinINET (and therefore running browsers) that settings changed
  $sig = @'
using System;
using System.Runtime.InteropServices;
public class WinINet {
  [DllImport("wininet.dll", SetLastError = true, CharSet = CharSet.Auto)]
  public static extern bool InternetSetOption(IntPtr hInternet, int dwOption, IntPtr lpBuffer, int dwBufferLength);
}
'@
  try {
    Add-Type -TypeDefinition $sig -ErrorAction SilentlyContinue | Out-Null
    [void][WinINet]::InternetSetOption([IntPtr]::Zero, 39, [IntPtr]::Zero, 0)  # SETTINGS_CHANGED
    [void][WinINet]::InternetSetOption([IntPtr]::Zero, 37, [IntPtr]::Zero, 0)  # REFRESH
    Write-Host "  (notified Windows that proxy settings changed)"
  } catch {
    Write-Host "  (could not notify WinINET; restarting the browser is enough)"
  }
}

if ($Status) { Show-State 'Current browser proxy settings:'; exit 0 }

if ($Restore) {
  if (-not (Test-Path $backup)) { Write-Host "No backup found at $backup"; exit 1 }
  $saved = Get-Content $backup | ConvertFrom-Json
  Set-ItemProperty -Path $key -Name ProxyEnable -Value $saved.ProxyEnable
  Set-ItemProperty -Path $key -Name ProxyServer -Value $saved.ProxyServer
  Write-Host "Restored the previous proxy settings."
  Show-State 'Now:'
  Notify-Change
  exit 0
}

# --- save current values, then disable the proxy ---------------------------
$p = Get-ItemProperty -Path $key
@{
  ProxyEnable = $p.ProxyEnable
  ProxyServer = $p.ProxyServer
  AutoConfigURL = $p.AutoConfigURL
  savedAt = (Get-Date).ToString('s')
} | ConvertTo-Json | Set-Content -Path $backup -Encoding UTF8
Write-Host "Saved the current settings to $backup"

Show-State 'Before:'
Set-ItemProperty -Path $key -Name ProxyEnable -Value 0
Notify-Change
Show-State 'After:'
Write-Host ""
Write-Host "Done. If a browser tab is still showing the proxy error, close that tab"
Write-Host "and open the site again (or restart the browser)."
Write-Host ""
Write-Host "To undo:  powershell -ExecutionPolicy Bypass -File `"$PSCommandPath`" -Restore"
