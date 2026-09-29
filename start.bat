@echo off
echo ==========================================
echo Grande Prêmio da Ética - Script de Início
echo ==========================================
echo.

echo [1/3] Iniciando PostgreSQL e API...
docker-compose up -d

echo.
echo [2/3] Aguardando o banco de dados estar pronto...
timeout /t 5 /nobreak >nul

echo.
echo [3/3] Instalando dependências do frontend...
call npm install

echo.
echo ==========================================
echo Tudo pronto!
echo.
echo Para executar o jogo:
echo   npm run dev
echo.
echo A API estará disponível em: http://localhost:3002
echo O banco de dados em: localhost:5433
echo ==========================================
pause
