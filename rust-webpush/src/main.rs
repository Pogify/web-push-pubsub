extern crate redis;
use redis::Commands;

#[macro_use] extern crate lazy_static;

use tokio::task;

lazy_static! {
   static ref redis_client: redis::Client = create_redis_client().unwrap();
}


fn create_redis_client() -> redis::RedisResult<redis::Client> {
    redis::Client::open("redis://127.0.0.1")
}

fn create_redis_connection(client: &redis::Client) -> redis::RedisResult<redis::Connection> {
    let mut con = client.get_connection()?;
    Ok(con)
}

fn pubsub_stuff() -> redis::RedisResult<String> {
    let mut con = create_redis_connection(&redis_client)?;
    let mut pubsub = con.as_pubsub();
    pubsub.subscribe("channel_1")?;
    let msg = pubsub.get_message()?;
    let payload: String = msg.get_payload()?;
    Ok(payload)
}

fn main() {
    println!("Hello, world!");
}
