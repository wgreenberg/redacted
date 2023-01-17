use std::{fmt::{Display, Write}, str::FromStr};

use crate::document::Document;

static EOF: char = '\x03';

#[derive(Debug)]
pub struct DocCache {
    pub docs: Vec<Document>,
}

impl DocCache {
    pub fn add(&mut self, doc_str: &str) -> Result<(), String> {
        self.docs.push(doc_str.parse()?);
        Ok(())
    }
}

fn rot13(s: &str) -> String {
    s.chars()
        .map(|c| match c {
            'a'..='z' => (((c as u8 - 97 + 13) % 26) + 97) as char,
            'A'..='Z' => (((c as u8 - 65 + 13) % 26) + 65) as char,
            _ => c,
        })
        .collect()
}

impl DocCache {
    pub fn new(docs: Vec<Document>) -> Self {
        DocCache { docs }
    }
}

impl Display for DocCache {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        for (i, doc) in self.docs.iter().enumerate() {
            f.write_str(&rot13(&doc.to_string()))?;
            if i < self.docs.len() - 1 {
                f.write_char(EOF)?;
            }
        }
        Ok(())
    }
}

impl FromStr for DocCache {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        let mut docs = Vec::new();
        for rot13_doc_str in s.split(EOF) {
            dbg!(rot13_doc_str);
            docs.push(rot13(rot13_doc_str).parse()?);
        }
        Ok(DocCache::new(docs))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_rot13() {
        assert_eq!(rot13("this [is]\na te[s]t!"), "guvf [vf]\nn gr[f]g!".to_string());
    }
}