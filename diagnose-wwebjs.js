const fs = require('fs');
const path = require('path');

const clientPath = path.join(__dirname, 'node_modules', 'whatsapp-web.js', 'src', 'Client.js');

console.log('Reading Client.js from:', clientPath);

if (fs.existsSync(clientPath)) {
    const content = fs.readFileSync(clientPath, 'utf8');

    console.log('\n--- File Stats ---');
    console.log('File size:', content.length, 'bytes');
    console.log('Line count:', content.split('\n').length);

    // Search for sendSeen anywhere
    console.log('\n--- Searching for "sendSeen" ---');
    const lines = content.split('\n');
    lines.forEach((line, i) => {
        if (line.includes('sendSeen')) {
            console.log(`Line ${i + 1}: ${line.trim().substring(0, 120)}`);
        }
    });

    // Search for markedUnread anywhere
    console.log('\n--- Searching for "markedUnread" ---');
    lines.forEach((line, i) => {
        if (line.includes('markedUnread')) {
            console.log(`Line ${i + 1}: ${line.trim().substring(0, 120)}`);
        }
    });

    // Search for sendMessage function
    console.log('\n--- Searching for "sendMessage" function definition ---');
    lines.forEach((line, i) => {
        if (line.includes('async sendMessage') || line.includes('sendMessage(') || line.includes('sendMessage =')) {
            console.log(`Line ${i + 1}: ${line.trim().substring(0, 120)}`);
        }
    });

} else {
    console.error('❌ Client.js not found.');

    // Try to find any .js files in the package
    const basePath = path.join(__dirname, 'node_modules', 'whatsapp-web.js');
    if (fs.existsSync(basePath)) {
        console.log('\nContents of whatsapp-web.js package:');
        fs.readdirSync(basePath).forEach(f => console.log('  ', f));

        const srcPath = path.join(basePath, 'src');
        if (fs.existsSync(srcPath)) {
            console.log('\nContents of src folder:');
            fs.readdirSync(srcPath).forEach(f => console.log('  ', f));
        }
    }
}
