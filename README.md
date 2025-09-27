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

## Sobre la Arquitectura del Proyecto

La estructura que implementamos se llama comúnmente "estructura por capas" o "arquitectura en capas", y más específicamente sigue el patrón de "arquitectura MVC (Modelo-Vista-Controlador)" extendido con componentes adicionales. En el contexto de aplicaciones de servidor como esta, también se le conoce como:

1. __Arquitectura por capas (Layered Architecture)__ - Separa la aplicación en capas lógicas: servicios, controladores, rutas, middleware, etc.

2. __Arquitectura basada en servicios (Service-based Architecture)__ - Donde la lógica de negocio se encapsula en servicios reutilizables.

3. __Arquitectura RESTful__ - Con rutas claramente definidas que siguen principios REST.

4. __Patrón MVC (Modelo-Vista-Controlador)__ extendido - Aunque no tenemos un componente de vista tradicional en una API, sí tenemos controladores y modelos (en este caso, servicios que actúan como modelos lógicos).

Esta estructura también incorpora principios de __separación de responsabilidades (SRP)__ del conjunto de principios SOLID, ya que cada archivo y directorio tiene una única responsabilidad bien definida.

En el contexto de Node.js y Express, esta organización se considera una __estructura modular__ o __estructura por módulos__, ya que cada componente (rutas, controladores, servicios) está encapsulado en módulos independientes que se importan y utilizan en el archivo principal.

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
- `FIREBASE_SERVICE_ACCOUNT_CTRLMP`: Contenido del archivo `functions/config/credCtrlMp.json`

**Nota**: El proyecto ya incluye el archivo de credenciales `credCtrlMp.json` que está protegido en `.gitignore`.

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