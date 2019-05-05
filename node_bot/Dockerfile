FROM node
WORKDIR /usr/src/fcard_game
COPY package*.json ./
RUN npm install
COPY .env .
COPY telecard.js .
COPY game_help.txt .
COPY dubito.js .
COPY statics.js .
CMD node telecard.js
