import WebSocket from 'ws';
import readline from 'readline';

const serverIP = process.argv[2] || '47.95.232.197';
const wsUrl = `ws://${serverIP}:3002`;

console.log(`正在连接 ${wsUrl}...`);

const ws = new WebSocket(wsUrl);
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

let username = '';

rl.question('请输入你的昵称: ', (name) => {
    username = name || `用户${Date.now()}`;
    
    ws.on('open', () => {
        console.log(`\n 已连接到聊天室！`);
        console.log(`你的昵称: ${username}`);
        console.log(`命令: /quit 退出`);
        console.log('─'.repeat(50));
        ws.send(JSON.stringify({
            type: 'join',
            username: username,
            content: '',
            timestamp: new Date().toLocaleTimeString(),
            userId: ''
        }));

        process.stdout.write('\n> ');
    });
    
    ws.on('message', (data) => {
        try {
            const msg = JSON.parse(data.toString());
            
            process.stdout.write('\r\x1b[K');
            
            if (msg.type === 'system') {
                console.log(`\n [系统] ${msg.content}`);
            } else if (msg.username === username) {
                console.log(`\n [我] ${msg.content}`);
            } else {
                console.log(`\n [${msg.username}] ${msg.content}`);
            }
            
            process.stdout.write('> ');
        } catch (e) {
            console.log(`\n 收到: ${data}`);
            process.stdout.write('> ');
        }
    });
    
    ws.on('error', (err) => {
        console.error(`\n 连接错误: ${err.message}`);
        rl.close();
        process.exit(1);
    });
    
    ws.on('close', () => {
        console.log('\n 连接已断开');
        rl.close();
    });
});

rl.on('line', (input) => {
    if (!input.trim()) return;
    
    if (input === '/quit') {
        console.log('正在退出...');
        ws.close();
        rl.close();
        process.exit(0);
    } else {
        ws.send(JSON.stringify({
            type: 'message',
            username: username,
            content: input,
            timestamp: new Date().toLocaleTimeString(),
            userId: ''
        }));
        process.stdout.write('> ');
    }
});