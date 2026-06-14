import WebSocket, { WebSocketServer } from 'ws';

interface ClientInfo {
    ws: WebSocket;
    userId: string;
    username: string;
}

class ChatRoomServer {
    private wss: WebSocketServer;
    private clients: Map<string, ClientInfo> = new Map();
    private port: number;

    constructor(port: number = 3002) {
        this.port = port;
        this.wss = new WebSocketServer({ port: this.port });
        this.init();
        console.log(`聊天室服务器已启动，端口: ${this.port}`);
    }

    private init(): void {
        this.wss.on('connection', (ws: WebSocket) => {
            const userId = this.generateUserId();
            console.log(`新用户连接，ID: ${userId}`);

            const clientInfo: ClientInfo = {
                ws: ws,
                userId: userId,
                username: `游客${userId.slice(-4)}`
            };
            this.clients.set(userId, clientInfo);

            this.sendToClient(ws, {
                type: 'system',
                username: '系统',
                content: `欢迎！你的ID是: ${userId}`,
                timestamp: this.getTime(),
                userId: 'system'
            });

            ws.on('message', (data: Buffer) => {
                this.handleMessage(userId, data.toString());
            });

            ws.on('close', () => {
                this.handleDisconnect(userId);
            });

            ws.on('error', (error) => {
                console.error(`客户端 ${userId} 错误:`, error);
            });
        });
    }

    private handleMessage(userId: string, messageStr: string): void {
        try {
            const message = JSON.parse(messageStr);
            const client = this.clients.get(userId);
            if (!client) return;

            if (message.type === 'join' && message.username) {
                const oldName = client.username;
                client.username = message.username;
                console.log(`${oldName} 改名为: ${client.username}`);
                
                this.broadcast({
                    type: 'system',
                    username: '系统',
                    content: `${client.username} 加入了聊天室`,
                    timestamp: this.getTime(),
                    userId: 'system'
                });
                return;
            }

            if (message.type === 'message' && message.content) {
                const chatMessage = {
                    type: 'message',
                    username: client.username,
                    content: message.content,
                    timestamp: this.getTime(),
                    userId: userId
                };
                
                console.log(`[${chatMessage.timestamp}] ${client.username}: ${message.content}`);
                this.broadcast(chatMessage);
            }
        } catch (error) {
            console.error('解析消息失败:', error);
        }
    }

    private handleDisconnect(userId: string): void {
        const client = this.clients.get(userId);
        if (client) {
            console.log(`${client.username} 断开连接`);
            
            this.broadcast({
                type: 'system',
                username: '系统',
                content: `${client.username} 离开了聊天室`,
                timestamp: this.getTime(),
                userId: 'system'
            });
            
            this.clients.delete(userId);
        }
    }

    private broadcast(message: any): void {
        this.clients.forEach((client) => {
            if (client.ws.readyState === WebSocket.OPEN) {
                this.sendToClient(client.ws, message);
            }
        });
    }

    private sendToClient(ws: WebSocket, message: any): void {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
        }
    }

    private generateUserId(): string {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
    }

    private getTime(): string {
        return new Date().toLocaleTimeString();
    }
}

const server = new ChatRoomServer(3002);