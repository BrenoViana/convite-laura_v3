# garantir dependências exatamente do lockfile
npm ci

# build produção (saída em dist/convite-laura_v3)
ng build --configuration production

# ------------------------------ #

# Branch Develop

git checkout develop
git add -A
git commit -m "feat(XXX): XXX"
git push -u origin develop

# ------------------------------ #

# Merge da develop na main #

# traga tudo atualizado
git fetch origin

# garanta que develop está OK
git checkout develop
git pull

# faça o merge na main
git checkout main
git pull
git merge --no-ff develop -m "merge(develop): XXX"

# publique
git push origin main

# ------------------------------ #

# Tag #

git tag -a v3.1.0 -m "RSVP modal + gifts popup + autoplay + layout"
git push origin v3.1.0
