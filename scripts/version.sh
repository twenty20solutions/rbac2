#!/bin/bash

# update CHANGELOG with new version
TODAY=$(date +%F)
echo "Updating CHANGELOG.md for $npm_package_version $TODAY ..."
sed -i -r "0,/^In development/{s/^In development/In development\n--------------------------------\
\n\nVersion $npm_package_version - ($TODAY)/}" CHANGELOG.md
git add CHANGELOG.md