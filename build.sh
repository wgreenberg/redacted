#! /bin/bash

wasm-pack build --release -d docs/pkg --target web
tsc
rm docs/pkg/.gitignore
sass docs/main.scss:docs/main.css
echo "done"