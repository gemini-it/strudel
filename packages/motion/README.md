# @strudel/motion

Ce paquet ajoute la fonctionnalité de détection de mouvement de l'appareil aux motifs strudel.

## Install

```sh
npm i @strudel/motion --save
```

## Usage

| Mouvement | Noms longs et alias | Description |
|----------------------------|-----------------------------------------------------------|------------------------------------------|
| Accélération | accelerationX (accX), accelerationY (accY), accelerationZ (accZ) | Valeurs d'accélération des axes X, Y, Z |
| Gravité | gravityX (gravX), gravityY (gravY), gravityZ (gravZ) | Valeurs de gravité des axes X, Y, Z |
| Rotation | rotationAlpha (rotA, rotZ), rotationBeta (rotB, rotX), rotationGamma (rotG, rotY) | Rotation autour des axes alpha, bêta, gamma et mappée aux axes X, Y, Z |
| Orientation | orientationAlpha (oriA, oriZ), orientationBeta (oriB, oriX), orientationGamma (oriG, oriY) | Valeurs d'orientation alpha, bêta, gamma et mappées aux axes X, Y, Z |
| Orientation absolue | absoluteOrientationAlpha (absOriA, absOriZ), absoluteOrientationBeta (absOriB, absOriX), absoluteOrientationGamma (absOriG, absOriY) | Valeurs d'orientation absolue alpha, bêta, gamma et mappées aux axes X, Y, Z |

## Example

```js
enableMotion() //enable DeviceMotion 

setcpm(200/4)

$_: accX.segment(16).gain().log()

$:n("0 1 3 1 5 4")
  .scale("Bb:lydian")
  .sometimesBy(0.5,sub(note(12)))
  .lpf(gravityY.range(20,1000))
  .lpq(gravityZ.range(1,30))
  .lpenv(gravityX.range(2,2))
  .gain(oriX.range(0.2,0.8))
  .room(oriZ.range(0,0.5))
  .attack(oriY.range(0,0.3))
  .delay(rotG.range(0,1))
  .decay(rotA.range(0,1))
  .attack(rotB.range(0,0.1))
  .sound("sawtooth")
```

## Setup SSL for Local Development

`DeviceMotionEvent` ne fonctionne qu'avec HTTPS, vous devrez donc activer SSL pour le développement local.
Essayez d'installer un plugin SSL pour Vite.

```sh
cd website
pnpm install -D @vitejs/plugin-basic-ssl
```

ajoutez le plugin basicSsl au bloc defineConfig dans `strudel/website/astro.config.mjs`

```js
vite: {
  plugins: [basicSsl()],
  server: {
    host: '0.0.0.0', // Ensures it binds to all network interfaces
    // https: { 
    //   key: '../../key.pem', //
    //   cert: '../../cert.pem',
    // },
  },
},
```

générer un certificat SSL pour éviter les avertissements de sécurité.

`openssl req -new -newkey rsa:2048 -days 365 -nodes -x509 -keyout key.pem -out cert.pem`
