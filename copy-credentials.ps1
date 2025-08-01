# Script para copiar las credenciales de Firebase al portapapeles
# Esto facilita la configuración del secret en GitHub

Write-Host "🔐 Copiando credenciales de Firebase al portapapeles..." -ForegroundColor Green

$credentialsPath = "functions/config/credCtrlMp.json"

if (Test-Path $credentialsPath) {
    try {
        # Leer el contenido del archivo
        $content = Get-Content $credentialsPath -Raw
        
        # Copiar al portapapeles
        $content | Set-Clipboard
        
        Write-Host "✅ Credenciales copiadas al portapapeles!" -ForegroundColor Green
        Write-Host ""
        Write-Host "📋 Ahora puedes:" -ForegroundColor Cyan
        Write-Host "1. Ir a GitHub → Settings → Secrets → Actions"
        Write-Host "2. Crear nuevo secret: FIREBASE_SERVICE_ACCOUNT_CTRLMP"
        Write-Host "3. Pegar el contenido (Ctrl+V)"
        Write-Host ""
        Write-Host "🔒 El archivo credCtrlMp.json está protegido en .gitignore"
        
    } catch {
        Write-Host "❌ Error al copiar las credenciales: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "❌ No se encontró el archivo $credentialsPath" -ForegroundColor Red
    Write-Host "Asegúrate de que el archivo existe en la ruta correcta."
} 