use wasm_bindgen::prelude::*;

use crate::query::Query;
use crate::document::Document;

#[derive(Debug, Clone)]
#[wasm_bindgen]
pub struct Email {
    subject: String,
    body: String,
}

#[wasm_bindgen]
impl Email {
    pub(crate) fn new(subject: &str, body: &str) -> Email {
        Email {
            subject: subject.to_string(),
            body: body.to_string(),
        }
    }

    pub(crate) fn new_query_result(query: &Query, new_docs: &[Document], old_docs: &[Document]) -> Email {
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