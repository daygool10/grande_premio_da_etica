FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY index.js ./
COPY events.js ./
COPY questions.js ./
COPY auth.js ./
COPY reveal.js ./
COPY shared/ ./shared/

EXPOSE 3002

CMD ["node", "index.js"]
