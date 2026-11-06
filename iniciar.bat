@echo off
TITLE SCRAPControl - Inicio
cd /d "%~dp0"
call npm run iniciar
if errorlevel 1 pause