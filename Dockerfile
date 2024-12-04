# Gunakan image Node.js sebagai base image
FROM node:18-alpine

# Tentukan working directory di dalam container
WORKDIR /usr/src/app

# Salin file package.json dan package-lock.json
COPY package*.json ./

# Install dependencies
RUN yarn install

# Salin seluruh file project ke dalam container
COPY . .

# Jalankan Prisma generate untuk membuat client
RUN npx prisma generate

# Expose port yang akan digunakan aplikasi
EXPOSE 3020

# Perintah untuk menjalankan aplikasi
CMD ["yarn", "dev"]