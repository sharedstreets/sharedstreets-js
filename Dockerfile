FROM node:11

ENV NPM_CONFIG_PREFIX=/home/node/.npm-global
ENV PATH=$PATH:/home/node/.npm-global/bin

USER node
WORKDIR /home/node/

COPY *.json ./

RUN npm install --only=dev && \
  npm install --only=prod 

COPY src/ ./src/
COPY bin/ ./bin/
RUN npm pack

FROM node:11 

ENV NPM_CONFIG_PREFIX=/home/node/.npm-global
ENV PATH=$PATH:/home/node/.npm-global/bin

WORKDIR /home/node/
USER node
COPY --from=0 /home/node/*.tgz .

RUN npm install -g *.tgz

ENTRYPOINT ["shst"]
CMD ["--help"]