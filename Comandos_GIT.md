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

git commit -m "feat(rsvp): Correção na confirmação das Crianças."
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
git merge --no-ff develop -m "merge(develop) - (rsvp): Correção na confirmação das Crianças."

# publique
git push origin main

# ------------------------------ #

# Tag #
git tag -a v3.2.1 -m "(rsvp): Correção na confirmação das Crianças."
git push origin v3.2.1
