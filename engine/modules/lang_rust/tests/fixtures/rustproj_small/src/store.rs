pub trait Countable {
    fn count(&self) -> usize;
}

pub struct Store {
    items: Vec<String>,
}

impl Store {
    pub fn new() -> Self {
        Store { items: Vec::new() }
    }

    pub fn add(&mut self, item: &str) {
        if !item.is_empty() {
            self.items.push(item.to_string());
        }
    }
}

impl Countable for Store {
    fn count(&self) -> usize {
        self.items.len()
    }
}
