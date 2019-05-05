-- CREATE DATABASE fcard_game
--     WITH
--     OWNER = postgres
--     ENCODING = 'UTF8'
--     CONNECTION LIMIT = -1;

CREATE SCHEMA fcard_game
    AUTHORIZATION postgres;

CREATE TABLE fcard_game.users
(
    user_id    integer                     NOT NULL,
    chat_id    character varying(50)       NOT NULL,
    nickname   character varying(50)       NOT NULL,
    first_seen timestamp without time zone NOT NULL,
    last_seen  timestamp without time zone NOT NULL,
    subscribed boolean DEFAULT false,
    PRIMARY KEY (user_id)
)
    WITH (
        OIDS = FALSE
    );

ALTER TABLE fcard_game.users
    OWNER to postgres;

CREATE TABLE fcard_game.games
(
    game_id     integer                     NOT NULL,
    "timestamp" timestamp without time zone NOT NULL,
    PRIMARY KEY (game_id)
)
    WITH (
        OIDS = FALSE
    );

ALTER TABLE fcard_game.games
    OWNER to postgres;

CREATE TABLE fcard_game.users_games
(
    user_id    integer,
    game_id    integer,
    "position" integer,
    CONSTRAINT pk PRIMARY KEY (user_id, game_id),
    CONSTRAINT users_fk FOREIGN KEY (user_id)
        REFERENCES fcard_game.users (user_id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,
    CONSTRAINT games_fk FOREIGN KEY (game_id)
        REFERENCES fcard_game.games (game_id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
)
    WITH (
        OIDS = FALSE
    );

ALTER TABLE fcard_game.users_games
    OWNER to postgres;

ALTER TABLE fcard_game.users
    ALTER COLUMN user_id ADD GENERATED ALWAYS AS IDENTITY;

ALTER TABLE fcard_game.games
    ALTER COLUMN game_id ADD GENERATED ALWAYS AS IDENTITY;

