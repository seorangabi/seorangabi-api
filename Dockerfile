FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./ 
COPY prisma ./prisma/ 

RUN yarn install --frozen-lockfile

COPY . . 

RUN npx prisma generate 
RUN yarn run build

FROM node:18-alpine AS runtime

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./ 
COPY --from=builder /app/dist ./dist 
COPY --from=builder /app/prisma ./prisma 

# Ekspose port untuk aplikasi
EXPOSE 3020

# Perintah default untuk menjalankan aplikasi
CMD ["yarn", "start:prod"]