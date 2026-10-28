# =====================================================================
# SCRIPT DE INICIO Y ACTUALIZACIÓN UNIFICADA: SCRAPControl
# =====================================================================
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "   INICIANDO SCRAPControl" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

# 1. Compilar y actualizar
Write-Host "`n[1/2] Compilando Backend y Frontend..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Compilación falló o faltan dependencias. Instalando..." -ForegroundColor Yellow
    npm run install:all
    npm run build
}

# 2. Iniciar ambos servidores concurrentemente
Write-Host "`n[2/2] Iniciando Servidor Backend (3001) y Frontend (5173)..." -ForegroundColor Green
Write-Host ">> Presiona Ctrl+C para detener ambos servicios cuando lo desees.`n" -ForegroundColor Gray

npm run dev
