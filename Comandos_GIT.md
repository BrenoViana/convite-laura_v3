# garantir dependências exatamente do lockfile
npm ci

# build produção (saída em dist/convite-laura_v3)
ng build --configuration production

# ------------------------------ #

# Branch Develop

# criar/sincronizar branch develop
git checkout -b develop 2>/dev/null || git checkout develop
git pull origin develop || true

# adicionar mudanças
git add -A

git commit -m "feat(rsvp): Modal e API para Confirmação de Presença, incluido cadastro das crianças em outra tabela"
git push -u origin develop

# ------------------------------ #

# Merge da develop na main #

# garanta que develop está OK
git checkout develop
git pull

# faça o merge na main
# traga tudo atualizado
git fetch origin

git checkout main
git pull origin main
git merge --no-ff develop -m "merge(develop) - (rsvp): Modal e API para Confirmação de Presença, incluido cadastro das crianças em outra tabela"

# publique
git push origin main

# ------------------------------ #

# Tag #
git tag -a v3.1.4 -m "(rsvp): Modal e API para Confirmação de Presença Ajustado"
git push origin v3.1.4
