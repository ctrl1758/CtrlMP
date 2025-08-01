# CtrlMP - Sistema de Pagos en Tiempo Real

## Descripción
CtrlMP es una aplicación web que permite monitorear pagos en tiempo real utilizando Firebase como backend. El sistema incluye autenticación de usuarios y un dashboard para visualizar transacciones.

## Características
- 🔐 Autenticación de usuarios con Firebase Auth
- 📊 Dashboard de pagos en tiempo real
- 🔄 Actualización automática de datos
- 📱 Interfaz responsive
- ⚡ Despliegue automático con GitHub Actions

## Tecnologías Utilizadas
- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Firebase (Firestore, Authentication)
- **Hosting**: Firebase Hosting
- **CI/CD**: GitHub Actions

## Estructura del Proyecto
```
CtrlMP/
├── functions/           # Cloud Functions
│   ├── public/         # Archivos públicos
│   │   └── pagos.html  # Dashboard de pagos
│   └── index.js        # Funciones principales
├── firebase.json       # Configuración de Firebase
├── firestore.rules     # Reglas de seguridad
└── .github/           # Configuración de GitHub Actions
```

## Configuración

### Prerrequisitos
- Node.js (versión 16 o superior)
- Firebase CLI
- Cuenta de GitHub
- Proyecto de Firebase

### Instalación
1. Clona el repositorio:
```bash
git clone https://github.com/tu-usuario/CtrlMP.git
cd CtrlMP
```

2. Instala las dependencias:
```bash
cd functions
npm install
```

3. Configura Firebase:
```bash
firebase login
firebase use ctrlmp-d13a1
```

### Despliegue
El proyecto se despliega automáticamente cada vez que se hace push a la rama principal. También puedes desplegar manualmente:

```bash
firebase deploy
```

## Variables de Entorno
Asegúrate de configurar las siguientes variables en GitHub Secrets:
- `FIREBASE_SERVICE_ACCOUNT_CTRLMP`: Credenciales de servicio de Firebase

## Contribución
1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## Licencia
Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## Contacto
- Proyecto: [https://github.com/tu-usuario/CtrlMP](https://github.com/tu-usuario/CtrlMP) 