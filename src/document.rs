use chrono::prelude::*;
use chrono::ParseError;
use wasm_bindgen::prelude::*;
use std::fmt::Display;
use std::str::FromStr;

use crate::query::Query;

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
            (c, true) if c == '\n' => result.push(c),
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
    pub(crate) title_full: String,
    pub(crate) title_redacted: String,
    pub(crate) date: NaiveDate,
    pub(crate) body_full: String,
    pub(crate) body_redacted: String,
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

    pub(crate) fn is_match(&self, query: &Query) -> bool {
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

impl Display for Document {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(&self.title_full)?;
        f.write_str("\n")?;
        f.write_str(&self.date.to_string())?;
        f.write_str("\n\n")?;
        f.write_str(&self.body_full)?;
        Ok(())
    }
}


#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_redact() {
        assert_eq!(redact("this [is] a te[s]t"), Ok("this ██ a te█t".into()));
        assert_eq!(redact("spaces [a b  c] matter"), Ok("spaces ██████ matter".into()));
        assert_eq!(redact("multi [line\n red]action"), Ok("multi ████\n████action".into()));
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

    #[test]
    fn test_to_string() {
        let doc_str = "foo\n1900-12-01\n\nhi\nthere";
        let doc = doc_str.parse::<Document>().unwrap();
        assert_eq!(doc.to_string(), doc_str);
    }
}