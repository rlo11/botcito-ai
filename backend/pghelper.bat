@echo off
set PGBIN=D:\pgsql\bin
set PGUSER=postgres
set PGDATABASE=botcito_db

if "%1"=="start" (
    %PGBIN%\pg_ctl.exe -D D:\pgsql\data start
) else if "%1"=="stop" (
    %PGBIN%\pg_ctl.exe -D D:\pgsql\data stop
) else if "%1"=="status" (
    %PGBIN%\pg_ctl.exe -D D:\pgsql\data status
) else if "%1"=="migrate" (
    %PGBIN%\psql.exe -U %PGUSER% -d %PGDATABASE% -f migrations/001_initial_schema.sql
    %PGBIN%\psql.exe -U %PGUSER% -d %PGDATABASE% -f migrations/002_saas_update.sql
) else (
    echo Usage: pghelper [start|stop|status|migrate]
)