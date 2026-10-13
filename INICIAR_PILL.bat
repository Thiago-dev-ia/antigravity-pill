@echo off
title Antigravity Pill
cd /d "%~dp0"

echo [Antigravity Pill] Verificando servicos...
tasklist /fi "imagename eq cli-proxy-api.exe" 2>nul | find /i "cli-proxy-api.exe" >nul
if errorlevel 1 (
    echo [Hub de Contas] Iniciando CLIProxyAPI na porta 8317...
    if exist "%USERPROFILE%\.local\bin\cliproxy-service.bat" (
        start "" "%USERPROFILE%\.local\bin\cliproxy-service.bat"
    )
)

echo [Antigravity Pill] Iniciando monitor de quotas...
start "" "%~dp0node_modules\electron\dist\electron.exe" "%~dp0."
echo.
echo Pilula iniciada com sucesso!
echo - Olhe no topo superior direito da sua tela (pendurada na borda superior).
echo - Um icone de anel laranja tambem fica na bandeja (perto do relogio).
echo.
ping 127.0.0.1 -n 3 > nul
