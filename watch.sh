#!/bin/bash

cargo watch \
    --ignore docs/pkg \
    --ignore docs/*.js \
    --ignore docs/img \
    --ignore docs/fonts \
    --ignore docs/main.css \
    --ignore docs/main.css.map \
    --ignore watch.sh \
    -- ./build.sh