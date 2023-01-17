#! /bin/bash -e

wasm-pack build --release -d docs/pkg --target web
cargo run documents docs/cache
tsc
rm docs/pkg/.gitignore
sass docs/main.scss:docs/main.css
echo "done"