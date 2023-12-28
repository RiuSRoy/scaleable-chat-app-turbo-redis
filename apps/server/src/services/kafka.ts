import { Kafka, Producer } from "kafkajs";
import fs from "fs";
import path from "path";
import prismaClient from "./prisma";

const kafka = new Kafka({
    clientId: 'my-app',
    brokers: ['kafka-2e99b257-iamash20-piyush.a.aivencloud.com:27819'],
    ssl: {
        ca: [fs.readFileSync(path.resolve("./ca.pem"), 'utf8')],
    },
    sasl: {
        username: "avnadmin",
        password: "AVNS_CX51eBCaPt6xss16Kww",
        mechanism: "plain"
    }
})

let producer: Producer | null = null;

async function createProducer() {
    if (producer) {
        return producer
    }
    producer = kafka.producer()
    await producer.connect()
    return producer;
}


export async function produceMessage(message: string) {
    const producer = await createProducer()
    await producer.send({
        messages: [{key: `${message}-${Date.now()}`, value: message}],
        topic: "COMMUNITY_CHAT"
    })
    return true
}

export async function startMessageConsumer() {
    const consumer = kafka.consumer({ groupId: 'chat-service' })

    await consumer.connect()
    await consumer.subscribe({ topic: 'COMMUNITY_CHAT', fromBeginning: true })

    await consumer.run({
        autoCommit: true,
        eachMessage: async ({ message, pause }) => {
            if (message.value) {
                try {
                    await prismaClient.message.create({ 
                        data: { 
                            text: message.value.toString()
                        }
                    })
                    console.log("Consumer wrote message to db!")
                } catch(err) {
                    console.log("Our Kafka consumer is down!")
                    pause();
                    setTimeout(() => {
                        consumer.resume([{ topic: 'COMMUNITY_CHAT'}])
                    }, 1000 * 60)
                }
            }
        },
    })
}

export default kafka