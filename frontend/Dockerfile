FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 8080 5173
CMD ["npm", "run", "dev", "--", "--host", "--port", "8080"]
