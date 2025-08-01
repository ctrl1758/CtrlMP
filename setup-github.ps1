# Script para configurar GitHub y Firebase para CtrlMP
# Ejecutar este script después de crear el repositorio en GitHub

Write-Host "🚀 Configurando CtrlMP para GitHub y Firebase..." -ForegroundColor Green

# Solicitar información del usuario
$githubUsername = Read-Host "Ingresa tu nombre de usuario de GitHub"
$repoName = "CtrlMP"

Write-Host "📝 Configurando Git..." -ForegroundColor Yellow

# Configurar el remote de GitHub
$remoteUrl = "https://github.com/$githubUsername/$repoName.git"
git remote add origin $remoteUrl

# Cambiar a rama main
git branch -M main

# Hacer push inicial
Write-Host "📤 Subiendo código a GitHub..." -ForegroundColor Yellow
git push -u origin main

Write-Host "✅ Configuración completada!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Próximos pasos:" -ForegroundColor Cyan
Write-Host "1. Ve a https://github.com/$githubUsername/$repoName/settings/secrets/actions"
Write-Host "2. Agrega el secret FIREBASE_SERVICE_ACCOUNT_CTRLMP con las credenciales de Firebase"
Write-Host "3. Haz un cambio en tu código y haz push para probar el despliegue automático"
Write-Host ""
Write-Host "🔗 URLs importantes:" -ForegroundColor Cyan
Write-Host "- Repositorio: https://github.com/$githubUsername/$repoName"
Write-Host "- Actions: https://github.com/$githubUsername/$repoName/actions"
Write-Host "- Dashboard: https://ctrlmp-d13a1.web.app" 