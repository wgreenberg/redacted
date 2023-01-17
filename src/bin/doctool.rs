use std::env;
use redacted::cache::DocCache;
use walkdir::WalkDir;

fn main() {
    let mut args = env::args();
    args.next();
    let (docs_path, cache_path) = match (args.next(), args.next()) {
        (Some(path), Some(output)) => (path, output),
        _ => panic!("give us some args, then"),
    };

    let mut cache = DocCache::new(vec![]);
    let files = WalkDir::new(&docs_path).into_iter()
        .filter_map(Result::ok)
        .filter(|entry| entry.file_type().is_file());

    for entry in files {
        let file_path = entry.path();
        println!("reading {}...", &file_path.display());
        let file_data = std::fs::read_to_string(&file_path).unwrap();
        cache.add(&file_data).unwrap();
    }

    if cache.docs.len() == 0 {
        panic!("no docs found in \"{}\"", &docs_path);
    }

    std::fs::write(&cache_path, cache.to_string()).unwrap();
    println!("wrote {} docs to \"{}\"", cache.docs.len(), &cache_path);
}