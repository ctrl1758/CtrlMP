# Configuración de GitHub Secrets para CtrlMP

## Pasos para configurar el despliegue automático

### 1. Crear el repositorio en GitHub
1. Ve a [GitHub](https://github.com) y crea un nuevo repositorio llamado `CtrlMP`
2. **NO** inicialices el repositorio con README, .gitignore o licencia (ya los tenemos)

### 2. Subir el código a GitHub
```bash
git remote add origin https://github.com/TU_USUARIO/CtrlMP.git
git branch -M main
git push -u origin main
```

### 3. Configurar las credenciales de Firebase

#### Obtener las credenciales de servicio:
1. Ve a la [Consola de Firebase](https://console.firebase.google.com)
2. Selecciona tu proyecto `ctrlmp-d13a1`
3. Ve a Configuración del proyecto (ícono de engranaje)
4. Pestaña "Cuentas de servicio"
5. Haz clic en "Generar nueva clave privada"
6. Descarga el archivo JSON

#### Configurar el secret en GitHub:
1. Ve a tu repositorio en GitHub
2. Pestaña "Settings"
3. En el menú lateral, haz clic en "Secrets and variables" → "Actions"
4. Haz clic en "New repository secret"
5. Nombre: `FIREBASE_SERVICE_ACCOUNT_CTRLMP`
6. Valor: Copia todo el contenido del archivo JSON descargado
7. Haz clic en "Add secret"

### 4. Verificar la configuración
Una vez configurado, cada vez que hagas push a la rama `main`, GitHub Actions automáticamente:
1. Instalará las dependencias
2. Desplegará tu aplicación a Firebase
3. Actualizará tu sitio web

### 5. Probar el despliegue
Haz un pequeño cambio en tu código y haz push:
```bash
git add .
git commit -m "Test de despliegue automático"
git push
```

Luego ve a la pestaña "Actions" en GitHub para ver el progreso del despliegue.

## URLs importantes
- **Dashboard de pagos**: https://ctrlmp-d13a1.web.app
- **Repositorio**: https://github.com/TU_USUARIO/CtrlMP
- **Actions**: https://github.com/TU_USUARIO/CtrlMP/actions 