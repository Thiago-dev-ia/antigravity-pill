@echo off
title Antigravity Pill
cd /d "%~dp0"
rem Sobe a pilula de quota das 5 contas Gemini (janela na borda direita da tela).
rem Se ja houver uma instancia rodando, esta aqui simplesmente nao duplica.
start "" /b cmd /c "npx electron . > nul 2>&1"
echo Pilula iniciada! Procure os aneis na borda direita da tela.
echo (o icone de anel laranja fica na bandeja do sistema - la tem: atualizar, mostrar/ocultar, sair)
timeout /t 3 > nul
