// Usage: npm run hash-password -- "myPassword123"
const bcrypt = require("bcryptjs");

const plain = process.argv[2];
if (!plain) {
  console.error('Usage: npm run hash-password -- "yourPassword"');
  process.exit(1);
}

console.log(bcrypt.hashSync(plain, 10));
