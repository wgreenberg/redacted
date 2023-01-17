use regex::{Regex, RegexBuilder, escape};
use wasm_bindgen::prelude::*;
use js_sys::Array;

use crate::document::Document;
use crate::email::Email;
use crate::util::vec_to_array;

#[derive(Debug)]
#[wasm_bindgen]
pub struct QueryResult {
    pub(crate) email: Email,
    pub(crate) docs: Vec<Document>,
}

#[wasm_bindgen]
impl QueryResult {
    #[wasm_bindgen(getter)] pub fn email(&self) -> Email { self.email.clone() }
    #[wasm_bindgen(getter)] pub fn docs(&self) -> Array { vec_to_array(&self.docs) }
}

pub struct Query {
    pub year: Option<i32>,
    pub input: String,
    pub pattern: Regex
}

impl Query {
    pub fn new(input: &str, year: Option<i32>) -> Result<Query, String> {
        let pattern = RegexBuilder::new(&escape(input))
            .case_insensitive(true)
            .build()
            .map_err(|err| err.to_string())?;
        Ok(Query { input: input.into(), year, pattern })
    }
}