const fs = require('fs');
const path = require('path');

const filePath = process.argv[2];
if (!filePath) {
    console.error('Usage: node fix_encoding.js <file_path>');
    process.exit(1);
}

try {
    // Read the file as Latin1 (this maps each byte 0-255 to U+0000-U+00FF)
    const content = fs.readFileSync(filePath, 'latin1');
    
    // Convert the string back to a Buffer of those same byte values
    const buffer = Buffer.from(content, 'latin1');
    
    // Now interpret that buffer as UTF-8
    // If it was double-encoded, we might need to do this twice.
    // Let's try once first.
    let fixed = buffer.toString('utf8');
    
    // Check if it's still mojibake. 
    // In our case, it was double-encoded: UTF8 -> Latin1 -> UTF8.
    // So the buffer we just got IS the mojibake bytes.
    // Wait, if the file has C3 83 C2 81, reading it as latin1 gives U+00C3 U+0083 U+00C2 U+0081.
    // Buffer.from(..., 'latin1') gives bytes C3 83 C2 81.
    // buffer.toString('utf8') gives U+00C3 U+0081 (the original UTF-8 bytes interpreted as characters).
    // This is still 'Ã\u0081'.
    // We need to do it AGAIN.
    
    const secondBuffer = Buffer.from(fixed, 'latin1');
    const finalFixed = secondBuffer.toString('utf8');
    
    fs.writeFileSync(filePath, finalFixed, 'utf8');
    console.log('Fixed encoding for ' + filePath);
} catch (err) {
    console.error('Error:', err);
}
