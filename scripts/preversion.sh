#!/bin/bash

echo "Stashing your working directory..."
git stash

echo "Updating to master..."
git checkout master

echo "Fetching..."
git fetch

echo "Resetting to origin/master"
git reset --hard origin/master

echo "Running npm ci"
npm ci

echo "Running tests"
npm test
