FROM node:18-slim

WORKDIR /app

RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 8080

ENV PORT=8080
ENV MBTILES_PATH=/app/data/chart.mbtiles

CMD ["npm", "start"]
