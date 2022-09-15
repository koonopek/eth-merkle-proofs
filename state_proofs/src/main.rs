use rlp::encode;

type Nibbles = [u8; 64];

pub enum Node {
    Empty,
    Branch([Nibbles; 17]),
    // path value
    Leaf((Nibbles, String)),
    // path key
    Extension((Nibbles, String)),
}

fn str_to_nibbles(str: &str) -> Nibbles {
    assert_eq!(str.len(), 32);
    let mut i = 0;
    let mut key: Nibbles = [0; 64];
    let chars: Vec<char> = str.chars().collect();

    while i < 64 {
        let nibble = match i % 2 {
            0 => (chars.get(i / 2).unwrap().to_owned() as u8) / 16,
            _ => {
                (chars
                    .get((i as f64 / 2.0).floor() as usize)
                    .unwrap()
                    .to_owned() as u8)
                    % 16
            }
        };

        key[i] = nibble;
        i += 1;
    }

    return key;
}

#[test]
fn str_to_key_test() {
    assert_eq!(
        str_to_nibbles("12345678901234567890123456789012"),
        [
            3, 1, 3, 2, 3, 3, 3, 4, 3, 5, 3, 6, 3, 7, 3, 8, 3, 9, 3, 0, 3, 1, 3, 2, 3, 3, 3, 4, 3,
            5, 3, 6, 3, 7, 3, 8, 3, 9, 3, 0, 3, 1, 3, 2, 3, 3, 3, 4, 3, 5, 3, 6, 3, 7, 3, 8, 3, 9,
            3, 0, 3, 1, 3, 2
        ],
    )
}

fn cap_node(e: Encodable) {}

// pub struct PatriceTree {
//     nodes: Vec<Node>,
// }

// impl PatriceTree {}

fn main() {
    println!("Hello, world!");
}
