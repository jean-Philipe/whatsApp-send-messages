const fs = require('fs');
const path = require('path');

const clientPath = path.join(__dirname, 'node_modules', 'whatsapp-web.js', 'src', 'Client.js');

console.log('Reading Client.js from:', clientPath);

if (fs.existsSync(clientPath)) {
    let content = fs.readFileSync(clientPath, 'utf8');
    
    // Find where sendSeen is called
    const match = content.match(/this\.sendSeen\(/);
    
    if (match) {
        console.log('Found "this.sendSeen(" at index:', match.index);
        const snippet = content.substring(match.index - 20, match.index + 40);
        console.log('Snippet:', snippet);
        
        // Replace generically: look for "await this.sendSeen(chatId)" possibly without semi-colon, or just Comment it out
        // valid patterns: 
        // await this.sendSeen(chatId);
        // await this.sendSeen(chatId)
        
        const originalLength = content.length;
        
        // This regex tries to match the whole line or statement
        content = content.replace(/await\s+this\.sendSeen\([^)]+\);?/g, '// sendSeen disabled by patch');
        
        if (content.length !== originalLength || content.includes('// sendSeen disabled by patch')) {
             fs.writeFileSync(clientPath, content);
             console.log('✅ Successfully patched Client.js! (Replaced with comment)');
        } else {
             console.log('⚠️ Found match but regex failed to replace. Trying fallback...');
             // Fallback: just replace the function name so it fails gracefully or does nothing? 
             // No, that might cause "is not a function".
             // Let's print what we see to debug if this fails.
        }
        
    } else {
        console.log('❌ Could not find "this.sendSeen(" in the file. Maybe it is not called directly?');
    }

} else {
    console.error('❌ Client.js not found at expected path.');
}
