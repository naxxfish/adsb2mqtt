FROM node:13.7-alpine AS builder
RUN apk add --update --no-cache python build-base
WORKDIR /usr/src/app
ADD ./package.json ./package.json
ADD ./package-lock.json ./package-lock.json
RUN npm install --production


FROM builder as tester
RUN npm install --devDependencies
ADD . .
RUN npm run style

FROM node:13.7-alpine
WORKDIR /usr/src/app
COPY --from=builder /usr/src/app/ .
ADD . .
CMD ["npm", "run", "production"]
