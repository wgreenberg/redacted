use wasm_bindgen::prelude::*;
use js_sys::Array;

use crate::cache::DocCache;
use crate::document::Document;
use crate::email::Email;
use crate::query::{QueryResult, Query};
use crate::util::vec_to_array;

#[derive(Debug, Clone)]
#[wasm_bindgen]
pub struct GameStateEvent {
    emails: Vec<Email>,
}

#[wasm_bindgen]
impl GameStateEvent {
    fn newgame_event() -> GameStateEvent {
        let email = Email::new("find anya", "look for the helios effect (1983). good luck.");
        GameStateEvent { emails: vec![email] }
    }

    #[wasm_bindgen(getter)] pub fn emails(&self) -> Array { vec_to_array(&self.emails) }
}

#[derive(Default)]
#[wasm_bindgen]
pub struct GameState {
    documents: Vec<Document>,
    document_hidden_status: Vec<bool>,
    events: Vec<GameStateEvent>,
}

#[wasm_bindgen]
impl GameState {
    pub fn new(doc_strs: Array) -> Result<GameState, String> {
        let mut docs = Vec::new();
        for s in doc_strs.iter() {
            let doc_str = s.as_string().ok_or("need doc string".to_string())?;
            docs.push(doc_str.parse()?);
        }
        Ok(GameState::inner_new(docs))
    }

    pub fn new_from_cache(data: &str) -> Result<GameState, String> {
        let cache: DocCache = data.parse()?;
        Ok(GameState::inner_new(cache.docs))
    }

    fn inner_new(documents: Vec<Document>) -> GameState {
        let document_hidden_status = vec![true; documents.len()];
        let events = vec![GameStateEvent::newgame_event()];
        GameState { documents, document_hidden_status, events }
    }

    pub fn drain_events(&mut self) -> Array {
        let result = Array::new();
        for event in self.events.drain(..) {
            result.push(&JsValue::from(event));
        }
        result
    }

    pub fn submit_query(&mut self, input: &str, year: i32) -> QueryResult {
        let query = Query::new(input, Some(year)).unwrap();
        let mut new_docs = Vec::new();
        let mut old_docs = Vec::new();
        for i in 0..self.documents.len() {
            if self.documents[i].is_match(&query) {
                if self.document_hidden_status[i] {
                    new_docs.push(self.documents[i].clone());
                    self.document_hidden_status[i] = false;
                } else {
                    old_docs.push(self.documents[i].clone());
                }
            }
        }
        QueryResult {
            email: Email::new_query_result(&query, &new_docs, &old_docs),
            docs: new_docs,
        }
    }
}