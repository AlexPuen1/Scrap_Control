Set-Location $PSScriptRoot
npm run iniciar
if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}
