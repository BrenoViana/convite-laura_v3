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

git commit -m "feat(rsvp): Ajuste do modal RSVP, removendo o campo de acompanhante"
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
git merge --no-ff develop -m "merge(develop) - (rsvp): Ajuste do modal RSVP, removendo o campo de acompanhante"

# publique
git push origin main

# ------------------------------ #

# Tag #
git tag -a v3.1.3 -m "(rsvp): Ajuste do modal RSVP, removendo o campo de acompanhante"
git push origin v3.1.3
