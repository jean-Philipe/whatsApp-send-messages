const fs = require('fs');
const path = require('path');

const clientPath = path.join(__dirname, 'node_modules', 'whatsapp-web.js', 'src', 'Client.js');

console.log('Looking for Client.js at:', clientPath);

if (fs.existsSync(clientPath)) {
    let content = fs.readFileSync(clientPath, 'utf8');

    // The crash happens because the library tries to mark the chat as seen/read,
    // but the WhatsApp Web internals for this have changed/broken.
    // Disabling this feature allows the message to send without crashing.

    // Pattern to look for: await this.sendSeen(chatId);
    // It might be inside sendMessage.

    const patchSignature = '// await this.sendSeen(chatId); // Patched by Agent';

    if (content.includes(patchSignature)) {
        console.log('File is already patched.');
    } else {
        // Attempt to find and replace the call
        if (content.includes('await this.sendSeen(chatId);')) {
            content = content.replace('await this.sendSeen(chatId);', patchSignature);
            fs.writeFileSync(clientPath, content);
            console.log('✅ Successfully patched Client.js to disable sendSeen!');
        } else {
            // Try with a regex in case of different formatting
            const regex = /await\s+this\.sendSeen\(chatId\);/g;
            if (regex.test(content)) {
                content = content.replace(regex, patchSignature);
                fs.writeFileSync(clientPath, content);
                console.log('✅ Successfully patched Client.js (using regex) to disable sendSeen!');
            } else {
                console.error('⚠️ Could not find "await this.sendSeen(chatId);" in Client.js. The file structure might be different.');
                process.exit(1);
            }
        }
    }
} else {
    console.error('❌ Client.js not found. Make sure you are in the project root and node_modules is installed.');
    process.exit(1);
}
