mod store;

use crate::store::Store;
use std::collections::HashMap;

fn main() {
    let mut s = Store::new();
    s.add("apple");
    let total = helper(s.count());
    println!("{}", total);
    let _m: HashMap<String, i32> = HashMap::new();
}

fn helper(n: usize) -> usize {
    n * 2
}
