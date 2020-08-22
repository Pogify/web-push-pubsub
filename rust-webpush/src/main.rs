extern crate redis;
use redis::{Commands, RedisResult};

#[macro_use] extern crate lazy_static;

use futures::future::join_all;
use serde::{Deserialize, Serialize};
use tokio::runtime::Handle;
use tokio::task;
use web_push::{
    ContentEncoding,
    SubscriptionInfo,
    VapidSignatureBuilder, 
    WebPushMessageBuilder,
    WebPushClient,
    WebPushError};


lazy_static! {
   static ref redis_client: redis::Client = create_redis_client().unwrap();
   static ref push_client: WebPushClient = WebPushClient::new();
}

#[derive(Debug, Deserialize, Serialize)]
struct Keys {
    p256dh: String,
    auth: String,
}

#[derive(Debug, Deserialize, Serialize)]
struct Viewer {
    endpoint: String,

    #[serde(default)]
    expirationTime: Option<String>,

    keys: Keys,
}


impl redis::FromRedisValue for Viewer {
    fn from_redis_value(v: &redis::Value) -> RedisResult<Viewer> {
        let res: String = String::from_redis_value(v).unwrap();
        let viewer: Viewer = serde_json::from_str(&res).unwrap();
        Ok(viewer)
    }
}


fn create_redis_client() -> RedisResult<redis::Client> {
    redis::Client::open("redis://127.0.0.1")
}


fn create_redis_connection(client: &redis::Client) -> RedisResult<redis::Connection> {
    let mut con = client.get_connection()?;
    Ok(con)
}


fn pubsub_stuff() -> RedisResult<String> {
    let mut con = create_redis_connection(&redis_client)?;
    let mut pubsub = con.as_pubsub();
    pubsub.subscribe("new data")?;
    let msg = pubsub.get_message()?;
    let payload: String = msg.get_payload()?;
    Ok(payload)
}


async fn send_to_viewer(viewer: &Viewer, data: &str) -> Result<(), WebPushError>{
    let subscription_info = SubscriptionInfo::new(
        &viewer.endpoint,
        &viewer.keys.p256dh,
        &viewer.keys.auth,
    );

    let file = std::fs::File::open("secrets/private.pem")?;

    let mut sig_builder = VapidSignatureBuilder::from_pem(file, &subscription_info)?;
    let signature = sig_builder.build()?;

    let mut builder = WebPushMessageBuilder::new(&subscription_info)?;
    // let content = "Hello there".as_bytes();
    builder.set_payload(ContentEncoding::AesGcm, data.as_bytes());
    builder.set_vapid_signature(signature);

    let response = push_client.send(builder.build().unwrap()).await?;
    println!("Got response {:?}", response);
    Ok(())
}


async fn push_to_all(id: String) -> Result<(), Box<dyn std::error::Error>> {
    let mut conn = create_redis_connection(&redis_client)?;
    let viewers: Vec<Viewer> = conn.smembers(&id)?;
    let payload: String = conn.get(format!("data:{}", id))?;
    let mut promises = Vec::new();
    for viewer in &viewers {
        promises.push(send_to_viewer(&viewer, &payload));
    }
    join_all(promises).await;
    Ok(())
}


#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("Hello world");
    loop {
        match pubsub_stuff() {
            Ok(id) => {
                println!("Notifying viewers of {}", id);
                let handle = Handle::current();
                handle.spawn( async {
                    push_to_all(id).await;
                });
                Ok(())
            },
            Err(e) => Err(e)
        };
    }
    Ok(())
}
