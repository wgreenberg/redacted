pub mod query;
pub mod cache;
pub mod gamestate;
pub mod email;
pub mod document;

use wasm_bindgen::prelude::*;

mod util {
    use js_sys::Array;
    use wasm_bindgen::prelude::*;

    pub fn vec_to_array<T>(v: &Vec<T>) -> Array where T: Clone, JsValue: From<T> {
        let result = Array::new();
        for item in v {
            result.push(&JsValue::from(item.clone()));
        }
        result
    }
}

#[wasm_bindgen]
pub fn init_panic_hook() {
    std::panic::set_hook(Box::new(console_error_panic_hook::hook));
}