use rlp::{decode, encode, encode_list, NULL_RLP};
use sha3::{Digest, Keccak256};

#[derive(PartialEq, Eq, Debug)]
pub enum Node {
    Empty,
    Branch(Vec<Vec<u8>>),
    // path value
    Leaf((Vec<u8>, Vec<u8>)),
    // path key
    Extension((Vec<u8>, Vec<u8>)),
}

fn str_to_nibbles(str: &str) -> [u8; 64] {
    assert_eq!(str.len(), 32);
    let mut i = 0;
    let mut key: [u8; 64] = [0; 64];
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
        str_to_nibbles("1234567890123456789012345678901A"),
        [
            3, 1, 3, 2, 3, 3, 3, 4, 3, 5, 3, 6, 3, 7, 3, 8, 3, 9, 3, 0, 3, 1, 3, 2, 3, 3, 3, 4, 3,
            5, 3, 6, 3, 7, 3, 8, 3, 9, 3, 0, 3, 1, 3, 2, 3, 3, 3, 4, 3, 5, 3, 6, 3, 7, 3, 8, 3, 9,
            3, 0, 3, 1, 4, 1
        ],
    )
}

const ASCII_A: u8 = 97;
const ASCII_F: u8 = 102;

const ASCII_0: u8 = 48;
const ASCII_9: u8 = 57;

pub fn decode_hex(bytes: Vec<u8>) -> Vec<u8> {
    let mut iterator = bytes.iter();
    let mut vec = vec![];
    let to_byte = |byte| match byte {
        n @ ASCII_0..=ASCII_9 => n - ASCII_0,
        n @ ASCII_A..=ASCII_F => (n - ASCII_A) + 10,
        n => panic!("Invalid hex character {}", n),
    };

    loop {
        match (iterator.next(), iterator.next()) {
            (Some(hi_half), Some(low_half)) => {
                vec.push((to_byte(*hi_half) << 4) + to_byte(*low_half))
            }
            (Some(hi_half), None) => vec.push(to_byte(*hi_half) << 4),
            _ => break,
        }
    }

    vec
}

fn cap_node(j: &Vec<(&Vec<u8>, &Vec<u8>)>, i: usize) -> Vec<u8> {
    if j.len() == 0 {
        NULL_RLP.to_vec()
    } else {
        let node = produce_node(j, i);

        let rlp_node = match node {
            Node::Extension(node_value) => {
                encode_list::<Vec<u8>, Vec<_>>(&[node_value.0, node_value.1])
            }
            Node::Leaf(node_value) => encode_list::<Vec<u8>, Vec<_>>(&[node_value.1]),
            Node::Branch(node_value) => encode_list::<Vec<u8>, Vec<_>>(&node_value),
            Node::Empty => todo!(),
        };

        // if rlp_node.len() <32 {
        //     return node;
        // }

        kec(rlp_node)
    }
}

fn kec(to_hash: impl AsRef<[u8]>) -> Vec<u8> {
    let mut hasher = Keccak256::default();
    hasher.update(to_hash);

    hasher.finalize().to_vec()
}

fn hex_prefix(nibbles_input: impl AsRef<[u8]>, node_type: bool) -> Vec<u8> {
    let nibbles = nibbles_input.as_ref();

    let prefix = if node_type != false { 2 } else { 0 };

    if nibbles.len() % 2 == 0 {
        let mut i = 0;
        let mut result = vec![16 * prefix];
        while i < nibbles.len() - 1 {
            result.push(nibbles[i] + nibbles[i + 1]);
            i += 2;
        }
        result
    } else {
        let mut i = 0;
        let mut result = vec![16 * (prefix + 1) + nibbles[i]];

        if nibbles.len() < 2 {
            result
        } else {
            while i < nibbles.len() - 2 {
                i += 1;
                result.push(nibbles[i] + nibbles[i + 1]);
            }
            result
        }
    }
}

#[test]
fn hex_prefix_test() {
    assert_eq!(hex_prefix(&vec![1, 2, 3], false), vec![17, 5]);
    assert_eq!(hex_prefix(&vec![1, 2, 3], true), vec![49, 5]);
    assert_eq!(hex_prefix(&vec![1, 2, 3, 4], false), vec![0, 3, 7]);
    assert_eq!(hex_prefix(&vec![1, 2, 3, 4], true), vec![32, 3, 7]);
}

fn produce_node(j: &Vec<(&Vec<u8>, &Vec<u8>)>, i: usize) -> Node {
    if j.len() == 0 {
        return Node::Empty;
    }

    if j.len() == 1 {
        Node::Leaf((hex_prefix(get_key_slice(j, 0, i), true), j[0].1.clone()))
    } else {
        if let Some(value) = longest_radix_len(j) {
            if value != i {
                Node::Extension((hex_prefix(get_key_slice(j, i, value), true), cap_node(j, i)))
            } else {
                branch_node(j, i)
            }
        } else {
            branch_node(j, i)
        }
    }
}

fn branch_node(j: &Vec<(&Vec<u8>, &Vec<u8>)>, i: usize) -> Node {
    let mut branches = vec![];
    let mut v = NULL_RLP.to_vec();
    for x in 0..=15 {
        let mut matched = vec![];
        for z in 0..j.len() {
            if j[z].0[x] == z as u8 {
                matched.push(j[z])
            }

            if j[z].0.len() == i {
                v = j[z].1.clone();
            }
        }

        branches.push(cap_node(&matched, i + 1));
    }
    branches.push(v);
    Node::Branch(branches)
}

fn longest_radix_len(j: &Vec<(&Vec<u8>, &Vec<u8>)>) -> Option<usize> {
    for x in 32..0 {
        let mut successes = 0;
        for index in 0..j.len() {
            let l = get_key_slice(j, index, x - 1);
            if l.len() == x {
                successes += 1;
            }
        }
        if successes == j.len() {
            return Some(x);
        }
    }
    None
}

fn get_key_slice(j: &Vec<(&Vec<u8>, &Vec<u8>)>, index: usize, i: usize) -> Vec<u8> {
    // to_vec can be replaced
    j[index].0[i..(j[index].0.len() - 1)].to_vec()
}

#[test]
fn produce_node_test() {
    assert_eq!(produce_node(&vec![], 0), Node::Empty);

    assert_eq!(
        produce_node(&vec![(&vec![1, 2, 3], &vec![1])], 0),
        Node::Leaf((vec![32, 3], vec![1]))
    );

    let result = produce_node(
        &vec![
            (
                &hex::decode("00000000000000000000000000000000").unwrap(),
                &b"v_______________________0___0".to_vec(),
            ),
            (
                &hex::decode("00000000000000000000000000000070").unwrap(),
                &b"v_______________________0___1".to_vec(),
            ),
            (
                &hex::decode("000000000000000000000000000000f0").unwrap(),
                &b"v_______________________0___2".to_vec(),
            ),
        ],
        0,
    );

    match result {
        Node::Branch(value) => {
            let root_rlp = encode_list::<Vec<u8>, Vec<_>>(&value);
            assert_eq!(
                hex::encode(kec(root_rlp)),
                "9e3a01bd8d43efb8e9d4b5506648150b8e3ed1caea596f84ee28e01a72635470"
            );
        }
        Node::Leaf(value) => {
            assert_eq!(
                hex::encode(encode_list::<Vec<u8>, Vec<_>>(&[value.1])),
                "5cb26357b95bb9af08475be00243ceb68ade0b66b5cd816b0c18a18c612d2d21"
            );
        }
        _ => todo!(),
    }
}
// fn trie(j: Vec<(KeyNibbles, Vec<u8>)>) {

// }

// pub struct PatriceTree {
//     nodes: Vec<Node>,
// }

// impl PatriceTree {}

fn main() {
    println!("Hello, world!");
}
