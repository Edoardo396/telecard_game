FROM postgres
ENV POSTGRES_DB fcard_game
ENV POSTGRES_PASSWORD docker
COPY create_schema.sql /docker-entrypoint-initdb.d/
