import { Server } from 'socket.io'
import { Redis } from 'ioredis';
import prismaClient from './prisma';
import kafka, { produceMessage } from './kafka';


// every server has two redis connections, one for publishing , one for subscribing
const pub = new Redis({
    host: 'redis-scaling-websocket-iamash20-piyush.a.aivencloud.com',
    port: 27806,
    username: 'default',
    password: 'AVNS_5AaXvbpJhBXULdhmr-b'
});
const sub = new Redis({
    host: 'redis-scaling-websocket-iamash20-piyush.a.aivencloud.com',
    port: 27806,
    username: 'default',
    password: 'AVNS_5AaXvbpJhBXULdhmr-b'
});

class SocketService {
    public io: Server
    constructor() {
        console.log("socket server is up!")
        this.io = new Server({
            cors: {
                allowedHeaders: ['*'],
                origin: '*'
            }
        });
        // whenever a new server spins up, it has o be ready to receive messages from its redis (subscriber)
        sub.subscribe("MESSAGES");
    }

    public initListeners() {
        this.io.on('connection', (socket) => {
            console.log('a user connected', socket.id);

            socket.on('event:message', async ({message}) => {
                console.log('New Message received: ', message)

                /* whenever this server receives a message from frontend (clientA), rather than propagating it to other clients connected to this server,
                it publishes to the redis (publisher)
                */
                console.log(`Publishing the message to redis...`)
                await pub.publish('MESSAGES', JSON.stringify(message))   
                
            })

            socket.on('disconnect', () => {
                console.log('user disconnected');
              });
        });

        // whenever any server publishes to the redis, every server (subscribers) listen to the message and propagate it to clients
        sub.on('message', async (channel, message) => {
            if (channel === "MESSAGES") {
                console.log(`Broadcasting message to all clients...`)
                this.io.emit('message', message);   // broadcasts to all clients connected to this server

                await produceMessage(message);
                console.log(`Message produced to Kafka Broker`)
            }
        })
    }
}

export default SocketService;