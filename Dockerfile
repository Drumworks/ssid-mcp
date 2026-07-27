FROM node:20-slim

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund

COPY index.js README.md ./

# Free tier needs no key; set SSID_API_KEY at runtime to raise limits.
ENTRYPOINT ["node", "index.js"]
