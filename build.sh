#! /bin/bash

wasm-pack build --release -d docs/pkg --target web
tsc
rm docs/pkg/.gitignore
echo "done"