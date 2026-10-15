# Horta Viva PWA — ESP32

PWA inicial em português para a horta inteligente. O painel funciona em modo de demonstração sem hardware e pode ser configurado para consultar uma API.

## Conteúdo
- `index.html`: estrutura do painel
- `style.css`: visual responsivo escuro com detalhes verdes
- `app.js`: dados, atualização, comandos e configuração da API
- `manifest.webmanifest`: instalação como PWA
- `sw.js`: cache básico para abrir a interface offline
- `icons/`: ícones do aplicativo

## Como testar no computador
Abra com um servidor web local, não apenas dando duplo clique no arquivo. Exemplo com Python:
```bash
python -m http.server 8080
```
Acesse `http://localhost:8080`. O service worker funciona em localhost ou HTTPS.

## Como publicar e instalar no iPhone
1. Envie os arquivos para um repositório GitHub.
2. Ative GitHub Pages em Settings → Pages → Deploy from a branch → `main` / root.
3. Abra a URL HTTPS publicada no Safari do iPhone.
4. Toque em Compartilhar → Adicionar à Tela de Início.

## API esperada pelo PWA
Configure no painel a URL base de um servidor que ofereça os endpoints abaixo. Todas as respostas devem ser JSON.

### `GET /api/status`
Exemplo:
```json
{
  "soil": 42,
  "temperature": 28.4,
  "airHumidity": 58,
  "light": 12000,
  "pumpOn": false,
  "autoMode": true,
  "threshold": 35,
  "maxPumpSeconds": 15,
  "lastWatered": null
}
```
`soil` deve ser uma porcentagem calibrada pelo firmware. `light` é opcional; se não houver sensor, enviar `null`. `lastWatered` pode ser uma data ISO 8601 ou `null`.

### `POST /api/pump`
Ligar (sempre impondo limite de segurança no firmware):
```json
{"on":true,"durationSeconds":15}
```
Desligar:
```json
{"on":false}
```

### `POST /api/settings`
```json
{"autoMode":true,"threshold":35,"maxPumpSeconds":15}
```

O servidor deve validar tipos e limites, autenticar os comandos e devolver um código HTTP de erro em caso de falha.

## Importante sobre HTTPS, rede local e segurança
- O painel publicado no GitHub Pages é HTTPS. Navegadores podem bloquear chamadas desse PWA para um ESP32 acessado por HTTP por causa de conteúdo misto; CORS também precisa estar configurado no servidor.
- Para funcionar de forma confiável no iPhone e permitir acesso remoto, use uma API HTTPS autenticada como intermediária (proxy/túnel seguro ou backend próprio). Não encaminhe a porta do ESP32 diretamente para a internet.
- Não coloque senhas Wi-Fi nem segredos permanentes no JavaScript público. O campo de token é apenas para testes com um serviço controlado por você; `localStorage` não é um cofre de segredos.
- O PWA ainda não é um sistema completo conectado ao hardware: o firmware/API ESP32 precisa implementar os endpoints acima.
- Proteja a bomba com driver/MOSFET ou relé adequado, diodo de roda livre quando aplicável, fonte de 12 V compatível, fusível e lógica de desligamento por timeout/falta de água.
- A duração máxima configurável no protótipo é em segundos para testes seguros. Ajuste para a bomba real somente após testar a hidráulica e implementar as proteções.

## Dados de demonstração
Os valores iniciais (42%, 28,4 °C, 58% e 12.000 lux) são fictícios. No modo de demonstração, comandos não chegam a nenhum ESP32. Registros de crescimento ficam armazenados apenas no navegador/aparelho em que foram criados.
