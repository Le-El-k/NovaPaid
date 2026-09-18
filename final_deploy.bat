@echo off
chcp 65001 >nul
echo Nettoyage des anciens dossiers de sauvegarde...
rd /s /q .coinsyool-source 2>nul
rd /s /q upcoin-source 2>nul
rd /s /q .nova-static-legacy 2>nul
rd /s /q .git 2>nul

echo Configuration de Git...
git init
git config user.name "Le-El-k"
git config user.email "siyapzegroupe@gmail.com"

echo Ajout de tous les fichiers...
powershell -Command "(Get-Content .gitignore -ErrorAction SilentlyContinue) -replace '^\.env\.local$', '' | Set-Content .gitignore"
powershell -Command "(Get-Content .gitignore -ErrorAction SilentlyContinue) -replace '^worker/\.dev\.vars$', '' | Set-Content .gitignore"
git add .

echo Enregistrement...
git commit -m "Publication complete du projet Nova Paid"
git branch -M main
git remote add origin https://github.com/Le-El-k/NovaPay.git

echo.
echo Envoi en cours vers GitHub...
git push -u origin main --force

echo.
echo Envoi termine avec succes !
pause
