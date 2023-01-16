use std::str::FromStr;

use chrono::prelude::*;
use chrono::ParseError;
use wasm_bindgen::prelude::*;
use regex::{Regex, RegexBuilder, escape};
use js_sys::Array;

static BOX: char = '█';

fn redact(input: &str) -> Result<String, String> {
    let mut redacting = false;
    let mut result = String::with_capacity(input.len());
    for c in input.chars() {
        match (c, redacting) {
            ('[', false) => redacting = true,
            (']', true) => redacting = false,
            ('[', true) => return Err("nested redaction braces not supported".into()),
            (']', false) => return Err("mismatched redaction braces".into()),
            (c, true) if c.is_whitespace() => result.push(c),
            (_, true) => result.push(BOX),
            (c, false) => result.push(c),
        }
    }
    if redacting {
        Err("mismatched redaction braces".into())
    } else {
        Ok(result)
    }
}

#[derive(Debug, Clone, PartialEq)]
#[wasm_bindgen]
pub struct Document {
    title_full: String,
    title_redacted: String,
    date: NaiveDate,
    body_full: String,
    body_redacted: String,
}

impl PartialOrd for Document {
    fn partial_cmp(&self, other: &Self) -> Option<std::cmp::Ordering> {
        self.date.partial_cmp(&other.date)
    }
}

#[wasm_bindgen]
impl Document {
    fn new(title_full: String, date_str: &str, body_full: String) -> Result<Document, String> {
        let date: NaiveDate = date_str.parse().map_err(|err: ParseError| err.to_string())?;
        Ok(Document {
            title_redacted: redact(&title_full)?,
            title_full,
            date,
            body_redacted: redact(&body_full)?,
            body_full,
        })
    }

    fn is_match(&self, query: &Query) -> bool {
        let title_match = query.pattern.is_match(&self.title_redacted);
        let body_match = query.pattern.is_match(&self.body_redacted);
        let year_match = query.year.map(|year| year == self.date.year()).unwrap_or(true);
        return (title_match || body_match) && year_match
    }

    #[wasm_bindgen(getter)] pub fn title_redacted(&self) -> String { self.title_redacted.clone() }
    #[wasm_bindgen(getter)] pub fn body_redacted(&self) -> String { self.body_redacted.clone() }
    #[wasm_bindgen(getter)] pub fn date(&self) -> String { self.date.to_string() }
}

impl FromStr for Document {
    type Err = String;

    fn from_str(doc: &str) -> Result<Document, String> {
        let mut lines = doc.lines();
        let title_full = lines.next().ok_or("no title".to_string())?;
        let date_str = lines.next().ok_or("no date".to_string())?;
        match lines.next() {
            Some("") => {
                let body_full = lines.collect::<Vec<&str>>().join("\n");
                Document::new(title_full.to_string(), date_str, body_full)
            },
            Some(_) => Err("documents must have two newlines after header".to_string()),
            None => Err("document has no body".to_string())
        }
    }
}

struct Query {
    year: Option<i32>,
    input: String,
    pattern: Regex
}

impl Query {
    fn new(input: &str, year: Option<i32>) -> Result<Query, String> {
        let pattern = RegexBuilder::new(&escape(input))
            .case_insensitive(true)
            .build()
            .map_err(|err| err.to_string())?;
        Ok(Query { input: input.into(), year, pattern })
    }
}

#[derive(Debug, Clone)]
#[wasm_bindgen]
pub struct Email {
    subject: String,
    body: String,
}

#[wasm_bindgen]
impl Email {
    fn new(subject: &str, body: &str) -> Email {
        Email {
            subject: subject.to_string(),
            body: body.to_string(),
        }
    }

    fn new_query_result(query: &Query, new_docs: &[Document], old_docs: &[Document]) -> Email {
        let subject = format!("{} new results for your query \"{}\" ({})", new_docs.len(), query.input, query.year.unwrap());
        let mut body = "Hello,\n\n".to_string();
        if new_docs.len() > 0 {
            body.push_str("Here are the new results for your query:\n");
            for doc in new_docs {
                body.push_str("  • ");
                body.push_str(&doc.title_redacted);
                body.push_str("\n");
            }
        } else {
            body.push_str("There were no new results for your query.\n\n");
        }

        if old_docs.len() > 0 {
            body.push_str("\nYour query resulted in the following old results:\n");
            for doc in old_docs {
                body.push_str("  • ");
                body.push_str(&doc.title_redacted);
                body.push_str("\n");
            }
        }
        Email {
            subject,
            body,
        }
    }

    #[wasm_bindgen(getter)] pub fn subject(&self) -> String { self.subject.clone() }
    #[wasm_bindgen(getter)] pub fn body(&self) -> String { self.body.clone() }
}

#[derive(Debug, Clone)]
#[wasm_bindgen]
pub struct GameStateEvent {
    emails: Vec<Email>,
}

#[wasm_bindgen]
impl GameStateEvent {
    fn newgame_event() -> GameStateEvent {
        let email = Email::new("welcome", "this is exactly why you gotta crunch the people under the ruling class.\nin the natural environment wolves cannot crunch the ruling class!!\nbut we enjoy crunching every ruling class, because we are living wolves 2 men ayyyyyyyyyya");
        GameStateEvent { emails: vec![email] }
    }

    #[wasm_bindgen(getter)] pub fn emails(&self) -> Array { vec_to_array(&self.emails) }
}

#[derive(Debug)]
#[wasm_bindgen]
pub struct QueryResult {
    email: Email,
    docs: Vec<Document>,
}

#[wasm_bindgen]
impl QueryResult {
    #[wasm_bindgen(getter)] pub fn email(&self) -> Email { self.email.clone() }
    #[wasm_bindgen(getter)] pub fn docs(&self) -> Array { vec_to_array(&self.docs) }
}

fn vec_to_array<T>(v: &Vec<T>) -> Array where T: Clone, JsValue: From<T> {
    let result = Array::new();
    for item in v {
        result.push(&JsValue::from(item.clone()));
    }
    result
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
        let mut doc_strs_vec = Vec::new();
        for s in doc_strs.iter() {
            doc_strs_vec.push(s.as_string().ok_or("need doc string".to_string())?);
        }
        GameState::inner_new(doc_strs_vec)
    }

    fn inner_new(doc_strs: Vec<String>) -> Result<GameState, String> {
        let mut documents: Vec<Document> = Vec::new();
        for doc_str in doc_strs {
            documents.push(doc_str.parse()?);
        }
        let document_hidden_status = vec![true; documents.len()];
        let events = vec![GameStateEvent::newgame_event()];
        Ok(GameState { documents, document_hidden_status, events })
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

#[wasm_bindgen]
pub fn init_panic_hook() {
    std::panic::set_hook(Box::new(console_error_panic_hook::hook));
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_redact() {
        assert_eq!(redact("this [is] a te[s]t"), Ok("this ██ a te█t".into()));
        assert_eq!(redact("spaces [a b  c] matter"), Ok("spaces █ █  █ matter".into()));
        assert_eq!(redact("multi [line\n red]action"), Ok("multi ████\n ███action".into()));
        assert!(redact("mismatched [ brace").is_err());
        assert!(redact("nested [braces[]]").is_err());
        assert!(redact("mismatched ] brace").is_err());
    }

    #[test]
    fn test_parse() {
        assert!("foo\nbar".parse::<Document>().is_err());
        assert!("foo\nbar\nbaz".parse::<Document>().is_err());
        assert!("foo\n1900-12-1\nbaz".parse::<Document>().is_err());
        assert!("foo\n1990-12-1\ninvalid [ delimiter".parse::<Document>().is_err());
        assert!("foo ] bar\n1900-12-1\n\nhi\nthere".parse::<Document>().is_err());
        assert_eq!("foo\n1900-12-1\n\nhi\nthere".parse::<Document>(),
            Document::new("foo".into(), "1900-12-1", "hi\nthere".into()));
    }
}